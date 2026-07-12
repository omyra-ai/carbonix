import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { Enquiry, Product } from './src/types.js';
import { 
  saveEnquiry, 
  getAllEnquiries, 
  updateEnquiryStatus, 
  getProducts, 
  addProduct, 
  deleteProduct, 
  getAdminSettings, 
  updateAdminSettings, 
  getPasskeys, 
  registerPasskey, 
  deletePasskey, 
  getAuditLogs, 
  verifyHashchainIntegrity, 
  logAuditEvent,
  recordLoginAttempt,
  checkIPLockState
} from './db.js';
import { sendEnquiryEmails, getResendClient } from './email-service.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory sessions & auth maps
const ACTIVE_SESSIONS = new Set<string>();
const ACTIVE_OTPS = new Map<string, { code: string; expires: Date }>();
const ACTIVE_CHALLENGES = new Map<string, { challenge: string; expires: Date }>();

// Helper to verify custom asymmetric ECDSA signature
function verifyEcdsaSignature(jwk: any, challenge: string, signatureBase64: string): boolean {
  try {
    const publicKey = crypto.createPublicKey({
      key: jwk,
      format: 'jwk'
    });
    
    const isVerified = crypto.verify(
      null,
      Buffer.from(challenge),
      publicKey,
      Buffer.from(signatureBase64, 'base64')
    );
    
    return isVerified;
  } catch (err) {
    console.error('❌ Crypto Signature Verification Error:', err);
    return false;
  }
}

const app = express();
app.use(express.json());

// Export the app for serverless platforms like Vercel
export { app };

// IP Extractor Helper
const getClientIP = (req: express.Request): string => {
  return (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '127.0.0.1').split(',')[0].trim();
};

// Auth Middleware
const authenticateAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
  }
  const token = authHeader.split(' ')[1];
  if (!ACTIVE_SESSIONS.has(token)) {
    return res.status(403).json({ error: 'Session expired or invalid.' });
  }
  next();
};

  /* ============================================================================
     PUBLIC CONFIG API
     ============================================================================ */

  // Retrieve public alias config so frontend can match routes dynamically
  app.get('/api/admin/alias', async (req, res) => {
    try {
      const settings = await getAdminSettings();
      return res.json({ alias: settings.alias });
    } catch (err) {
      return res.json({ alias: 'admin' });
    }
  });

  /* ============================================================================
     ADMIN AUTHENTICATION FLOWS (OTP & PASSKEY)
     ============================================================================ */

  // Request email OTP
  app.post('/api/admin/login/request-otp', async (req, res) => {
    const ip = getClientIP(req);
    
    // Check brute force lockout
    const lockState = await checkIPLockState(ip);
    if (lockState.locked) {
      return res.status(429).json({ 
        error: 'Too many login attempts. Access is temporarily suspended.', 
        lockedUntil: lockState.lockedUntil 
      });
    }

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Admin email required.' });
    }

    try {
      const settings = await getAdminSettings();
      if (email.toLowerCase().trim() !== settings.email.toLowerCase().trim()) {
        // Log unauthorized attempt to audit block
        await logAuditEvent(`UNAUTHORIZED ACCESS ATTEMPT: Incorrect Email entered ("${email}") from IP ${ip}`);
        // Increment attempts to prevent discovery mining
        await recordLoginAttempt(ip, false);
        return res.status(400).json({ error: 'Invalid administrator credentials.' });
      }

      // Generate secure 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      ACTIVE_OTPS.set(email.toLowerCase(), {
        code,
        expires: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
      });

      // Dispatch Email via Resend
      const client = getResendClient();
      if (client) {
        await client.emails.send({
          from: 'security@omyra.org',
          to: email,
          subject: '🔑 CURATED Console Verification OTP',
          html: `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e5e5e5; border-radius: 16px; background-color: #faf9f6; color: #1c1917;">
              <div style="text-align: center; border-bottom: 1px solid #e5e5e5; padding-bottom: 16px; margin-bottom: 24px;">
                <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; color: #78716c;">Administrator Security System</span>
                <h2 style="margin: 8px 0 0 0; font-size: 18px; font-weight: 800; color: #ff6b35; text-transform: uppercase;">VERIFICATION OTP</h2>
              </div>
              <p style="font-size: 14px; color: #44403c; line-height: 1.6; margin-bottom: 24px;">
                A terminal is requesting administrative access to the CURATED marketplace console. Use the cryptographic one-time password below to authenticate.
              </p>
              <div style="text-align: center; margin: 24px 0;">
                <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 0.15em; color: #1c1917; padding: 12px 24px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e5e5; display: inline-block;">
                  ${code}
                </span>
              </div>
              <p style="font-size: 12px; color: #78716c; line-height: 1.5;">
                This OTP is active for <strong>5 minutes</strong>. If you did not initiate this authentication request from IP <strong>${ip}</strong>, immediately verify your server environment integrity.
              </p>
            </div>
          `
        });
        console.log(`✉️ OTP dispatched successfully to ${email}.`);
      } else {
        // Console fallback for easy development and testing
        console.log(`\n========================================================================\n🔐 SECURITY OTP FOR ${email}: [ ${code} ]\n========================================================================\n`);
      }

      return res.json({ success: true, message: 'OTP successfully dispatched.' });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to process OTP request.' });
    }
  });

  // Verify email OTP
  app.post('/api/admin/login/verify-otp', async (req, res) => {
    const ip = getClientIP(req);
    
    const lockState = await checkIPLockState(ip);
    if (lockState.locked) {
      return res.status(429).json({ error: 'Too many login attempts. Locked out.', lockedUntil: lockState.lockedUntil });
    }

    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and OTP code are required.' });
    }

    try {
      const otpStore = ACTIVE_OTPS.get(email.toLowerCase());
      if (!otpStore) {
        await recordLoginAttempt(ip, false);
        return res.status(400).json({ error: 'No active authentication session found.' });
      }

      if (new Date() > otpStore.expires) {
        ACTIVE_OTPS.delete(email.toLowerCase());
        await recordLoginAttempt(ip, false);
        return res.status(400).json({ error: 'This verification code has expired.' });
      }

      if (otpStore.code !== code.trim()) {
        const attempt = await recordLoginAttempt(ip, false);
        await logAuditEvent(`SECURITY AUDIT: Failed OTP Entry (${5 - attempt.attempts} attempts remaining) from IP ${ip}`);
        return res.status(400).json({ error: 'Incorrect OTP entered.' });
      }

      // Success!
      ACTIVE_OTPS.delete(email.toLowerCase());
      await recordLoginAttempt(ip, true);

      // Issue dynamic session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      ACTIVE_SESSIONS.add(sessionToken);

      await logAuditEvent(`SECURE ACCESS GRANTED: Successful email OTP login from IP ${ip}`);

      return res.json({ success: true, token: sessionToken });
    } catch (err) {
      return res.status(500).json({ error: 'Internal validation failure.' });
    }
  });

  // Issue custom challenge for Device Passkey signature flow
  app.post('/api/admin/passkeys/challenge', async (req, res) => {
    const { passkeyId } = req.body;
    if (!passkeyId) {
      return res.status(400).json({ error: 'Passkey Identifier required.' });
    }

    const challenge = crypto.randomBytes(32).toString('hex');
    ACTIVE_CHALLENGES.set(passkeyId, {
      challenge,
      expires: new Date(Date.now() + 2 * 60 * 1000) // 2 minutes
    });

    return res.json({ challenge });
  });

  // Verify custom challenge asymmetric signature
  app.post('/api/admin/passkeys/verify', async (req, res) => {
    const ip = getClientIP(req);

    const lockState = await checkIPLockState(ip);
    if (lockState.locked) {
      return res.status(429).json({ error: 'Too many signature attempts. Locked out.', lockedUntil: lockState.lockedUntil });
    }

    const { passkeyId, signature, challenge } = req.body;
    if (!passkeyId || !signature || !challenge) {
      return res.status(400).json({ error: 'Missing challenge verification arguments.' });
    }

    try {
      const storedChallenge = ACTIVE_CHALLENGES.get(passkeyId);
      if (!storedChallenge || storedChallenge.challenge !== challenge || new Date() > storedChallenge.expires) {
        await recordLoginAttempt(ip, false);
        return res.status(400).json({ error: 'Challenge expired or mismatch.' });
      }

      // Query matching passkey public key from DB
      const passkeys = await getPasskeys();
      const passkey = passkeys.find((pk) => pk.id === passkeyId);

      if (!passkey) {
        await recordLoginAttempt(ip, false);
        return res.status(400).json({ error: 'Device public key unrecognized.' });
      }

      // Parse JWK and verify signature
      const jwk = JSON.parse(passkey.publicKey);
      const isVerified = verifyEcdsaSignature(jwk, challenge, signature);

      if (!isVerified) {
        const attempt = await recordLoginAttempt(ip, false);
        await logAuditEvent(`SECURITY ALERT: Defective Passkey Signature verified for device "${passkey.name}" from IP ${ip}`);
        return res.status(400).json({ error: 'Asymmetric verification failed. Invalid key pair.' });
      }

      // Clean up challenge
      ACTIVE_CHALLENGES.delete(passkeyId);
      await recordLoginAttempt(ip, true);

      // Successful login!
      const sessionToken = crypto.randomBytes(32).toString('hex');
      ACTIVE_SESSIONS.add(sessionToken);

      await logAuditEvent(`PASSKEY ACCESS GRANTED: Authenticated using device passkey "${passkey.name}" [ID: ${passkeyId.substring(0, 8)}...]`);

      return res.json({ success: true, token: sessionToken });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: 'Asymmetric decryption process error: ' + err.message });
    }
  });

  // Register public key device passkey
  app.post('/api/admin/passkeys/register', authenticateAdmin, async (req, res) => {
    const { id, name, publicKey } = req.body;
    if (!id || !name || !publicKey) {
      return res.status(400).json({ error: 'Invalid registration details.' });
    }

    try {
      const success = await registerPasskey(id, name, publicKey);
      if (success) {
        return res.json({ success: true });
      }
      return res.status(500).json({ error: 'Failed to record public key to credentials table.' });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // Get current registered passkeys
  app.get('/api/admin/passkeys', authenticateAdmin, async (req, res) => {
    try {
      const passkeys = await getPasskeys();
      return res.json(passkeys);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch passkeys.' });
    }
  });

  // Remove / Revoke a registered passkey
  app.delete('/api/admin/passkeys/:id', authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      const success = await deletePasskey(id);
      if (success) {
        return res.json({ success: true });
      }
      return res.status(404).json({ error: 'Passkey not found.' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to revoke credentials.' });
    }
  });

  // Logout admin session
  app.post('/api/admin/logout', authenticateAdmin, async (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      ACTIVE_SESSIONS.delete(token);
    }
    return res.json({ success: true });
  });

  /* ============================================================================
     ADMIN SETTINGS MANAGEMENT
     ============================================================================ */

  app.get('/api/admin/profile', authenticateAdmin, async (req, res) => {
    try {
      const settings = await getAdminSettings();
      return res.json(settings);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to load profile.' });
    }
  });

  app.post('/api/admin/profile/update', authenticateAdmin, async (req, res) => {
    const { email, alias } = req.body;
    if (!email || !alias) {
      return res.status(400).json({ error: 'Email and Route alias are required.' });
    }

    const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!cleanAlias) {
      return res.status(400).json({ error: 'Route alias must consist of letters, numbers, hyphens, and underscores only.' });
    }

    try {
      await updateAdminSettings(email.trim(), cleanAlias);
      return res.json({ success: true, email, alias: cleanAlias });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  /* ============================================================================
     CRYPTOGRAPHIC AUDIT LOG API
     ============================================================================ */

  app.get('/api/admin/audit-logs', authenticateAdmin, async (req, res) => {
    try {
      const logs = await getAuditLogs();
      return res.json(logs);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to load audit trail.' });
    }
  });

  app.post('/api/admin/audit-logs/verify', authenticateAdmin, async (req, res) => {
    try {
      const result = await verifyHashchainIntegrity();
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: 'Verification failed.' });
    }
  });

  /* ============================================================================
     PRODUCTS DATABASE API
     ============================================================================ */

  // Retrieve products dynamically from the database
  app.get('/api/products', async (req, res) => {
    try {
      const productsList = await getProducts();
      return res.json(productsList);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch catalog.' });
    }
  });

  // Create a product piece (requires Admin Authentication)
  app.post('/api/products', authenticateAdmin, async (req, res) => {
    const {
      name,
      category,
      price,
      description,
      detailedDescription,
      image,
      images,
      specs,
      featured
    } = req.body;

    if (!name || !category || !price || !description || !detailedDescription || !image) {
      return res.status(400).json({ error: 'Missing required product attributes.' });
    }

    try {
      const newProduct: Product = {
        id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name,
        category,
        price: Number(price),
        rating: 5.0,
        reviewsCount: 0,
        description,
        detailedDescription,
        image,
        images: Array.isArray(images) && images.length > 0 ? images : [image],
        specs: Array.isArray(specs) ? specs : [],
        featured: featured || false,
      };

      await addProduct(newProduct);
      return res.status(201).json({ success: true, product: newProduct });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to upload product piece: ' + err.message });
    }
  });

  // Delete a product (requires Admin Authentication)
  app.delete('/api/products/:id', authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      const success = await deleteProduct(id);
      if (success) {
        return res.json({ success: true });
      }
      return res.status(404).json({ error: 'Product piece not found.' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete product.' });
    }
  });

  /* ============================================================================
     ENQUIRIES BACKWARD COMPATIBLE API
     ============================================================================ */

  // API Route to submit enquiry
  app.post('/api/enquiries', async (req, res) => {
    try {
      const {
        productId,
        productName,
        productCategory,
        productPrice,
        productThumbnail,
        firstName,
        lastName,
        email,
        phone,
        message,
      } = req.body;

      if (!productId || !productName || !firstName || !lastName || !email || !phone) {
        return res.status(400).json({ error: 'Missing required enquiry details.' });
      }

      const newEnquiry: Enquiry = {
        id: `enq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        productId,
        productName,
        productCategory,
        productPrice,
        productThumbnail,
        firstName,
        lastName,
        email,
        phone,
        message: message || '',
        submittedAt: new Date().toISOString(),
        status: 'Pending',
      };

      await saveEnquiry(newEnquiry);
      await sendEnquiryEmails(newEnquiry);

      return res.status(201).json({
        success: true,
        message: 'Enquiry submitted successfully and forwarded to admin email.',
        enquiry: newEnquiry,
      });
    } catch (err: any) {
      console.error('Error processing enquiry:', err);
      return res.status(500).json({ error: 'Failed to submit enquiry due to server error.' });
    }
  });

  // Fetch all enquiries (requires authentication now for state security)
  app.get('/api/enquiries', authenticateAdmin, async (req, res) => {
    try {
      const enquiries = await getAllEnquiries();
      return res.json(enquiries);
    } catch (err) {
      console.error('Error fetching enquiries:', err);
      return res.status(500).json({ error: 'Failed to fetch enquiries.' });
    }
  });

  // Update enquiry status (requires authentication now)
  app.post('/api/enquiries/:id/status', authenticateAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (status !== 'Pending' && status !== 'Contacted') {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const success = await updateEnquiryStatus(id, status);
      if (!success) {
        return res.status(404).json({ error: 'Enquiry not found.' });
      }

      return res.json({ success: true });
    } catch (err) {
      console.error('Error updating enquiry status:', err);
      return res.status(500).json({ error: 'Failed to update enquiry status.' });
    }
  });

  // Only start the standalone server if we are running in a local/non-serverless environment (i.e. not Vercel)
  if (!process.env.VERCEL) {
    const PORT = 3000;
    if (process.env.NODE_ENV !== 'production') {
      createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      }).then((vite) => {
        app.use(vite.middlewares);
        app.listen(PORT, '0.0.0.0', () => {
          console.log(`Server running on http://0.0.0.0:${PORT} in development mode`);
        });
      });
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://0.0.0.0:${PORT} in production mode`);
      });
    }
  }
