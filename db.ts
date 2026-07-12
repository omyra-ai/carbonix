import pg from 'pg';
import crypto from 'crypto';
import { Enquiry, Product } from './src/types.js';
import { PRODUCTS as DEFAULT_PRODUCTS } from './src/data/products.js';

let pool: pg.Pool | null = null;

// IN-MEMORY FALLBACK STORES (For seamless operation if PostgreSQL is unconfigured)
const inMemoryEnquiries: Enquiry[] = [];
let inMemoryProducts: Product[] = [...DEFAULT_PRODUCTS];
const inMemorySettings: Record<string, string> = {
  admin_email: 'lunexa.official@gmail.com',
  admin_alias: 'admin',
};
const inMemoryPasskeys: Array<{ id: string; name: string; publicKey: string; addedAt: string }> = [];
const inMemoryAuditLogs: Array<{ id: number; action: string; timestamp: string; previousHash: string; hash: string }> = [];
const inMemoryLoginAttempts: Record<string, { attempts: number; lockedUntil: string | null }> = {};

// Helper to calculate SHA256 hashes for the hashchain
function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function getDbPool(): pg.Pool | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }
  if (!pool) {
    pool = new pg.Pool({
      connectionString,
      ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false }
    });

    // Run table creation migrations sequentially
    const setupDatabase = async () => {
      try {
        const client = await pool!.connect();
        try {
          // 1. Enquiries Table
          await client.query(`
            CREATE TABLE IF NOT EXISTS enquiries (
              id VARCHAR(255) PRIMARY KEY,
              product_id VARCHAR(255) NOT NULL,
              product_name VARCHAR(255) NOT NULL,
              product_category VARCHAR(255),
              product_price DECIMAL(10, 2) NOT NULL,
              product_thumbnail TEXT,
              first_name VARCHAR(255) NOT NULL,
              last_name VARCHAR(255) NOT NULL,
              email VARCHAR(255) NOT NULL,
              phone VARCHAR(255) NOT NULL,
              message TEXT,
              submitted_at VARCHAR(255) NOT NULL,
              status VARCHAR(50) DEFAULT 'Pending'
            )
          `);

          // 2. Products Table
          await client.query(`
            CREATE TABLE IF NOT EXISTS products (
              id VARCHAR(255) PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              category VARCHAR(255) NOT NULL,
              price DECIMAL(10, 2) NOT NULL,
              rating DECIMAL(3, 2) DEFAULT 5.0,
              reviews_count INTEGER DEFAULT 0,
              description TEXT NOT NULL,
              detailed_description TEXT NOT NULL,
              image TEXT NOT NULL,
              images TEXT NOT NULL, -- Stored as comma-separated or JSON
              specs TEXT NOT NULL, -- Stored as JSON string
              featured BOOLEAN DEFAULT false
            )
          `);

          // 3. Admin Settings Table (Key-Value)
          await client.query(`
            CREATE TABLE IF NOT EXISTS admin_settings (
              key VARCHAR(255) PRIMARY KEY,
              value TEXT NOT NULL
            )
          `);

          // Seed default admin email and alias if missing
          await client.query(`
            INSERT INTO admin_settings (key, value)
            VALUES ('admin_email', 'lunexa.official@gmail.com')
            ON CONFLICT (key) DO NOTHING
          `);
          await client.query(`
            INSERT INTO admin_settings (key, value)
            VALUES ('admin_alias', 'admin')
            ON CONFLICT (key) DO NOTHING
          `);

          // Seed products table with default items if empty
          const pCountRes = await client.query('SELECT COUNT(*) FROM products');
          if (parseInt(pCountRes.rows[0].count) === 0) {
            console.log('📦 PostgreSQL: Seeding default curated products...');
            for (const p of DEFAULT_PRODUCTS) {
              await client.query(`
                INSERT INTO products (id, name, category, price, rating, reviews_count, description, detailed_description, image, images, specs, featured)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              `, [
                p.id,
                p.name,
                p.category,
                p.price,
                p.rating,
                p.reviewsCount,
                p.description,
                p.detailedDescription,
                p.image,
                p.images.join(','),
                JSON.stringify(p.specs),
                p.featured || false
              ]);
            }
          }

          // 4. Admin Passkeys Table
          await client.query(`
            CREATE TABLE IF NOT EXISTS admin_passkeys (
              id VARCHAR(255) PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              public_key TEXT NOT NULL,
              added_at VARCHAR(255) NOT NULL
            )
          `);

          // 5. Hashchain Audit Logs Table
          await client.query(`
            CREATE TABLE IF NOT EXISTS admin_audit_log (
              id SERIAL PRIMARY KEY,
              action TEXT NOT NULL,
              timestamp VARCHAR(255) NOT NULL,
              previous_hash VARCHAR(64) NOT NULL,
              hash VARCHAR(64) NOT NULL
            )
          `);

          // Seed genesis block if audit log is completely empty
          const logCountRes = await client.query('SELECT COUNT(*) FROM admin_audit_log');
          if (parseInt(logCountRes.rows[0].count) === 0) {
            const timestamp = new Date().toISOString();
            const action = 'SYSTEM: Cryptographic Audit Hashchain Initialized';
            const previous_hash = '0000000000000000000000000000000000000000000000000000000000000000';
            const logHash = sha256(action + timestamp + previous_hash);
            await client.query(`
              INSERT INTO admin_audit_log (action, timestamp, previous_hash, hash)
              VALUES ($1, $2, $3, $4)
            `, [action, timestamp, previous_hash, logHash]);
          }

          // 6. Brute Force Login Lockouts Table
          await client.query(`
            CREATE TABLE IF NOT EXISTS admin_login_attempts (
              ip VARCHAR(255) PRIMARY KEY,
              attempts INTEGER DEFAULT 0,
              locked_until VARCHAR(255)
            )
          `);

          console.log('✅ PostgreSQL: Full-stack schemas, settings, seeding, and security tables successfully initialized.');
        } finally {
          client.release();
        }
      } catch (err: any) {
        console.error('❌ PostgreSQL: Database initialization failed:', err.message);
      }
    };

    setupDatabase();
  }
  return pool;
}

// Ensure database is initialized at start
getDbPool();

/* ============================================================================
   ENQUIRIES API
   ============================================================================ */

export async function saveEnquiry(enquiry: Enquiry): Promise<void> {
  const pool = getDbPool();
  if (!pool) {
    inMemoryEnquiries.unshift(enquiry);
    await logAuditEvent('Enquiry Submitted Offline (Memory): Ref ' + enquiry.id);
    return;
  }

  try {
    await pool.query(
      `INSERT INTO enquiries (
        id, product_id, product_name, product_category, product_price, 
        product_thumbnail, first_name, last_name, email, phone, message, submitted_at, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        enquiry.id,
        enquiry.productId,
        enquiry.productName,
        enquiry.productCategory,
        enquiry.productPrice,
        enquiry.productThumbnail,
        enquiry.firstName,
        enquiry.lastName,
        enquiry.email,
        enquiry.phone,
        enquiry.message,
        enquiry.submittedAt,
        enquiry.status
      ]
    );
    await logAuditEvent('New Enquiry Filed: Ref ' + enquiry.id + ' for product ' + enquiry.productName);
  } catch (err: any) {
    console.error(`❌ PostgreSQL: saveEnquiry failed:`, err.message);
    inMemoryEnquiries.unshift(enquiry);
  }
}

export async function getAllEnquiries(): Promise<Enquiry[]> {
  const pool = getDbPool();
  if (!pool) {
    return inMemoryEnquiries;
  }

  try {
    const res = await pool.query('SELECT * FROM enquiries ORDER BY submitted_at DESC');
    return res.rows.map((row) => ({
      id: row.id,
      productId: row.product_id,
      productName: row.product_name,
      productCategory: row.product_category,
      productPrice: Number(row.product_price),
      productThumbnail: row.product_thumbnail,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      message: row.message || '',
      submittedAt: row.submitted_at,
      status: row.status as 'Pending' | 'Contacted',
    }));
  } catch (err: any) {
    console.error('❌ PostgreSQL: getAllEnquiries failed:', err.message);
    return inMemoryEnquiries;
  }
}

export async function updateEnquiryStatus(id: string, status: 'Pending' | 'Contacted'): Promise<boolean> {
  const pool = getDbPool();
  const enqCached = inMemoryEnquiries.find((e) => e.id === id);
  if (enqCached) {
    enqCached.status = status;
  }

  if (!pool) {
    await logAuditEvent(`Enquiry Status Updated Offline: ID ${id} -> ${status}`);
    return enqCached !== undefined;
  }

  try {
    const res = await pool.query('UPDATE enquiries SET status = $1 WHERE id = $2', [status, id]);
    await logAuditEvent(`Enquiry Status Updated: ID ${id} -> ${status}`);
    return (res.rowCount ?? 0) > 0;
  } catch (err: any) {
    console.error(`❌ PostgreSQL: updateEnquiryStatus failed:`, err.message);
    return false;
  }
}

/* ============================================================================
   PRODUCTS API
   ============================================================================ */

export async function getProducts(): Promise<Product[]> {
  const pool = getDbPool();
  if (!pool) {
    return inMemoryProducts;
  }

  try {
    const res = await pool.query('SELECT * FROM products ORDER BY id DESC');
    if (res.rows.length === 0) return inMemoryProducts;
    return res.rows.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      price: Number(row.price),
      rating: Number(row.rating),
      reviewsCount: row.reviews_count,
      description: row.description,
      detailedDescription: row.detailed_description,
      image: row.image,
      images: row.images ? row.images.split(',') : [row.image],
      specs: row.specs ? JSON.parse(row.specs) : [],
      featured: row.featured,
    }));
  } catch (err: any) {
    console.error('❌ PostgreSQL: getProducts failed, using in-memory list:', err.message);
    return inMemoryProducts;
  }
}

export async function addProduct(product: Product): Promise<void> {
  const pool = getDbPool();
  inMemoryProducts.unshift(product);

  if (!pool) {
    await logAuditEvent(`New Product Uploaded Offline: ${product.name} (Ref: ${product.id})`);
    return;
  }

  try {
    await pool.query(`
      INSERT INTO products (id, name, category, price, rating, reviews_count, description, detailed_description, image, images, specs, featured)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      product.id,
      product.name,
      product.category,
      product.price,
      product.rating,
      product.reviewsCount,
      product.description,
      product.detailedDescription,
      product.image,
      product.images.join(','),
      JSON.stringify(product.specs),
      product.featured || false
    ]);
    await logAuditEvent(`New Product Uploaded to Catalog: ${product.name} (Ref: ${product.id})`);
  } catch (err: any) {
    console.error('❌ PostgreSQL: addProduct failed:', err.message);
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  const pool = getDbPool();
  const index = inMemoryProducts.findIndex((p) => p.id === id);
  if (index !== -1) {
    inMemoryProducts.splice(index, 1);
  }

  if (!pool) {
    await logAuditEvent(`Product Removed Offline: ID ${id}`);
    return index !== -1;
  }

  try {
    const res = await pool.query('DELETE FROM products WHERE id = $1', [id]);
    await logAuditEvent(`Product Removed: ID ${id}`);
    return (res.rowCount ?? 0) > 0;
  } catch (err: any) {
    console.error('❌ PostgreSQL: deleteProduct failed:', err.message);
    return false;
  }
}

/* ============================================================================
   ADMIN SETTINGS API
   ============================================================================ */

export async function getAdminSettings(): Promise<{ email: string; alias: string }> {
  const pool = getDbPool();
  if (!pool) {
    return {
      email: inMemorySettings.admin_email,
      alias: inMemorySettings.admin_alias,
    };
  }

  try {
    const res = await pool.query('SELECT * FROM admin_settings');
    const settings: Record<string, string> = {};
    res.rows.forEach((row) => {
      settings[row.key] = row.value;
    });

    return {
      email: settings.admin_email || 'lunexa.official@gmail.com',
      alias: settings.admin_alias || 'admin',
    };
  } catch (err: any) {
    console.error('❌ PostgreSQL: getAdminSettings failed, using memory:', err.message);
    return {
      email: inMemorySettings.admin_email,
      alias: inMemorySettings.admin_alias,
    };
  }
}

export async function updateAdminSettings(email: string, alias: string): Promise<void> {
  const pool = getDbPool();
  inMemorySettings.admin_email = email;
  inMemorySettings.admin_alias = alias.toLowerCase().replace(/[^a-z0-9_-]/g, '');

  if (!pool) {
    await logAuditEvent(`Admin Profile Updated Offline: Email=${email}, Alias=/${alias}`);
    return;
  }

  try {
    await pool.query(`
      INSERT INTO admin_settings (key, value) VALUES ('admin_email', $1)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `, [email]);

    await pool.query(`
      INSERT INTO admin_settings (key, value) VALUES ('admin_alias', $1)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `, [alias.toLowerCase().replace(/[^a-z0-9_-]/g, '')]);

    await logAuditEvent(`Admin Profile Configured: Email=${email}, Access Route=/${alias}`);
  } catch (err: any) {
    console.error('❌ PostgreSQL: updateAdminSettings failed:', err.message);
  }
}

/* ============================================================================
   PASSKEYS API
   ============================================================================ */

export async function getPasskeys(): Promise<Array<{ id: string; name: string; publicKey: string; addedAt: string }>> {
  const pool = getDbPool();
  if (!pool) {
    return inMemoryPasskeys;
  }

  try {
    const res = await pool.query('SELECT * FROM admin_passkeys ORDER BY added_at DESC');
    return res.rows.map((row) => ({
      id: row.id,
      name: row.name,
      publicKey: row.public_key,
      addedAt: row.added_at,
    }));
  } catch (err: any) {
    console.error('❌ PostgreSQL: getPasskeys failed:', err.message);
    return inMemoryPasskeys;
  }
}

export async function registerPasskey(id: string, name: string, publicKey: string): Promise<boolean> {
  const currentPasskeys = await getPasskeys();
  if (currentPasskeys.length >= 4) {
    throw new Error('Maximum limit of 4 registered passkeys reached.');
  }

  const addedAt = new Date().toISOString();
  const pool = getDbPool();

  inMemoryPasskeys.unshift({ id, name, publicKey, addedAt });

  if (!pool) {
    await logAuditEvent(`Asymmetric Crypto Passkey Registered Offline: "${name}" (ID: ${id.substring(0, 8)}...)`);
    return true;
  }

  try {
    await pool.query(`
      INSERT INTO admin_passkeys (id, name, public_key, added_at)
      VALUES ($1, $2, $3, $4)
    `, [id, name, publicKey, addedAt]);
    await logAuditEvent(`Asymmetric Crypto Passkey Registered: "${name}" (ID: ${id.substring(0, 8)}...)`);
    return true;
  } catch (err: any) {
    console.error('❌ PostgreSQL: registerPasskey failed:', err.message);
    return false;
  }
}

export async function deletePasskey(id: string): Promise<boolean> {
  const pool = getDbPool();
  const idx = inMemoryPasskeys.findIndex((pk) => pk.id === id);
  if (idx !== -1) {
    inMemoryPasskeys.splice(idx, 1);
  }

  if (!pool) {
    await logAuditEvent(`Crypto Passkey Revoked Offline: ID ${id.substring(0, 8)}...`);
    return idx !== -1;
  }

  try {
    const res = await pool.query('DELETE FROM admin_passkeys WHERE id = $1', [id]);
    await logAuditEvent(`Crypto Passkey Revoked: ID ${id.substring(0, 8)}...`);
    return (res.rowCount ?? 0) > 0;
  } catch (err: any) {
    console.error('❌ PostgreSQL: deletePasskey failed:', err.message);
    return false;
  }
}

/* ============================================================================
   CRYPTOGRAPHIC HASHCHAIN AUDIT LOGS
   ============================================================================ */

export async function logAuditEvent(action: string): Promise<void> {
  const timestamp = new Date().toISOString();
  const pool = getDbPool();

  if (!pool) {
    const lastLog = inMemoryAuditLogs[0];
    const previousHash = lastLog
      ? lastLog.hash
      : '0000000000000000000000000000000000000000000000000000000000000000';
    const logHash = sha256(action + timestamp + previousHash);

    inMemoryAuditLogs.unshift({
      id: inMemoryAuditLogs.length + 1,
      action,
      timestamp,
      previousHash,
      hash: logHash,
    });
    return;
  }

  try {
    // Fetch latest log to get previous hash
    const latestRes = await pool.query('SELECT hash FROM admin_audit_log ORDER BY id DESC LIMIT 1');
    const previousHash = latestRes.rows.length > 0
      ? latestRes.rows[0].hash
      : '0000000000000000000000000000000000000000000000000000000000000000';

    const logHash = sha256(action + timestamp + previousHash);

    await pool.query(`
      INSERT INTO admin_audit_log (action, timestamp, previous_hash, hash)
      VALUES ($1, $2, $3, $4)
    `, [action, timestamp, previousHash, logHash]);
  } catch (err: any) {
    console.error('❌ PostgreSQL: logAuditEvent failed:', err.message);
  }
}

export async function getAuditLogs(): Promise<Array<{ id: number; action: string; timestamp: string; previousHash: string; hash: string }>> {
  const pool = getDbPool();
  if (!pool) {
    // Return gen-block + logs
    if (inMemoryAuditLogs.length === 0) {
      const ts = new Date().toISOString();
      const action = 'SYSTEM: Cryptographic Audit Hashchain Initialized';
      const prev = '0000000000000000000000000000000000000000000000000000000000000000';
      const h = sha256(action + ts + prev);
      inMemoryAuditLogs.push({ id: 1, action, timestamp: ts, previousHash: prev, hash: h });
    }
    return inMemoryAuditLogs;
  }

  try {
    const res = await pool.query('SELECT id, action, timestamp, previous_hash AS "previousHash", hash FROM admin_audit_log ORDER BY id DESC');
    return res.rows;
  } catch (err: any) {
    console.error('❌ PostgreSQL: getAuditLogs failed:', err.message);
    return inMemoryAuditLogs;
  }
}

export async function verifyHashchainIntegrity(): Promise<{ verified: boolean; brokenIndex?: number }> {
  const logs = await getAuditLogs();
  if (logs.length === 0) return { verified: true };

  // Chronological traversal from oldest to newest (so reverse the desc fetch)
  const orderedLogs = [...logs].reverse();

  for (let i = 0; i < orderedLogs.length; i++) {
    const log = orderedLogs[i];

    // Recalculate hash
    const expectedHash = sha256(log.action + log.timestamp + log.previousHash);
    if (log.hash !== expectedHash) {
      console.error(`⚠️ Hashchain Verification Breach detected at log index ${log.id}!`);
      return { verified: false, brokenIndex: log.id };
    }

    // Verify link to previous hash
    if (i > 0) {
      const prevLog = orderedLogs[i - 1];
      if (log.previousHash !== prevLog.hash) {
        console.error(`⚠️ Hashchain Link broken between log ID ${prevLog.id} and ${log.id}!`);
        return { verified: false, brokenIndex: log.id };
      }
    }
  }

  return { verified: true };
}

/* ============================================================================
   BRUTE FORCE RATE LIMITING
   ============================================================================ */

export async function recordLoginAttempt(ip: string, isSuccessful: boolean): Promise<{ locked: boolean; lockedUntil: string | null; attempts: number }> {
  const now = new Date();
  const pool = getDbPool();

  if (!pool) {
    if (!inMemoryLoginAttempts[ip]) {
      inMemoryLoginAttempts[ip] = { attempts: 0, lockedUntil: null };
    }

    const state = inMemoryLoginAttempts[ip];

    // Check if currently locked
    if (state.lockedUntil && new Date(state.lockedUntil) > now) {
      return { locked: true, lockedUntil: state.lockedUntil, attempts: state.attempts };
    }

    if (isSuccessful) {
      state.attempts = 0;
      state.lockedUntil = null;
      return { locked: false, lockedUntil: null, attempts: 0 };
    } else {
      state.attempts += 1;
      if (state.attempts >= 5) {
        const lockDuration = 15 * 60 * 1000; // 15 minutes lockout
        const lockExpiration = new Date(now.getTime() + lockDuration).toISOString();
        state.lockedUntil = lockExpiration;
        await logAuditEvent(`SECURITY ALERT: Persistent authentication failures from IP ${ip}. Access throttled/locked.`);
        return { locked: true, lockedUntil: lockExpiration, attempts: state.attempts };
      }
      return { locked: false, lockedUntil: null, attempts: state.attempts };
    }
  }

  try {
    const attemptRes = await pool.query('SELECT * FROM admin_login_attempts WHERE ip = $1', [ip]);
    let attempts = 0;
    let lockedUntil: string | null = null;

    if (attemptRes.rows.length > 0) {
      attempts = attemptRes.rows[0].attempts;
      lockedUntil = attemptRes.rows[0].locked_until;

      // If already locked out
      if (lockedUntil && new Date(lockedUntil) > now) {
        return { locked: true, lockedUntil, attempts };
      }
    }

    if (isSuccessful) {
      await pool.query('INSERT INTO admin_login_attempts (ip, attempts, locked_until) VALUES ($1, 0, NULL) ON CONFLICT (ip) DO UPDATE SET attempts = 0, locked_until = NULL', [ip]);
      return { locked: false, lockedUntil: null, attempts: 0 };
    } else {
      attempts += 1;
      if (attempts >= 5) {
        const lockDuration = 15 * 60 * 1000; // 15 mins
        const lockExpiration = new Date(now.getTime() + lockDuration).toISOString();
        await pool.query('INSERT INTO admin_login_attempts (ip, attempts, locked_until) VALUES ($1, $2, $3) ON CONFLICT (ip) DO UPDATE SET attempts = EXCLUDED.attempts, locked_until = EXCLUDED.locked_until', [ip, attempts, lockExpiration]);
        await logAuditEvent(`SECURITY ALERT: Persistent authentication failures from IP ${ip}. Access throttled/locked.`);
        return { locked: true, lockedUntil: lockExpiration, attempts };
      } else {
        await pool.query('INSERT INTO admin_login_attempts (ip, attempts, locked_until) VALUES ($1, $2, NULL) ON CONFLICT (ip) DO UPDATE SET attempts = EXCLUDED.attempts, locked_until = NULL', [ip, attempts]);
        return { locked: false, lockedUntil: null, attempts };
      }
    }
  } catch (err: any) {
    console.error('❌ PostgreSQL: recordLoginAttempt failed:', err.message);
    return { locked: false, lockedUntil: null, attempts: 0 };
  }
}

export async function checkIPLockState(ip: string): Promise<{ locked: boolean; lockedUntil: string | null }> {
  const now = new Date();
  const pool = getDbPool();

  if (!pool) {
    const state = inMemoryLoginAttempts[ip];
    if (state && state.lockedUntil && new Date(state.lockedUntil) > now) {
      return { locked: true, lockedUntil: state.lockedUntil };
    }
    return { locked: false, lockedUntil: null };
  }

  try {
    const res = await pool.query('SELECT locked_until FROM admin_login_attempts WHERE ip = $1', [ip]);
    if (res.rows.length > 0) {
      const lockedUntil = res.rows[0].locked_until;
      if (lockedUntil && new Date(lockedUntil) > now) {
        return { locked: true, lockedUntil };
      }
    }
    return { locked: false, lockedUntil: null };
  } catch (err: any) {
    console.error('❌ PostgreSQL: checkIPLockState failed:', err.message);
    return { locked: false, lockedUntil: null };
  }
}
