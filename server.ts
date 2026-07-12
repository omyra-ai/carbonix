import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { Enquiry } from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory store for enquiries
  const ENQUIRIES: Enquiry[] = [];

  // API Route to submit enquiry
  app.post('/api/enquiries', (req, res) => {
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

      ENQUIRIES.unshift(newEnquiry);

      // Simulate sending to Admin Email (matrixgyan88094@gmail.com or custom)
      const adminEmail = 'matrixgyan88094@gmail.com';
      console.log(`
========================================================================
📧 SIMULATED ADMIN EMAIL NOTIFICATION
========================================================================
TO: ${adminEmail}
FROM: notifications@curatedmarketplace.com
SUBJECT: New Product Enquiry: ${productName} [Ref: ${newEnquiry.id}]
------------------------------------------------------------------------
Dear Admin,

A new high-interest purchase enquiry has been submitted:

👤 CUSTOMER DETAILS:
- Name: ${firstName} ${lastName}
- Email: ${email}
- Phone: ${phone}

📦 PRODUCT ENQUIRED:
- Product Name: ${productName}
- Category: ${productCategory}
- Price: $${productPrice}
- Thumbnail: ${productThumbnail}
- Ref ID: ${productId}

💬 CUSTOMER MESSAGE:
"${message || 'No additional questions entered.'}"

------------------------------------------------------------------------
Please contact the user via email (${email}) or their phone (${phone})
promptly to process this enquiry.
========================================================================
      `);

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

  // API Route to fetch all enquiries (for Admin View)
  app.get('/api/enquiries', (req, res) => {
    res.json(ENQUIRIES);
  });

  // API Route to update enquiry status
  app.post('/api/enquiries/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const enquiry = ENQUIRIES.find((e) => e.id === id);
    if (!enquiry) {
      return res.status(404).json({ error: 'Enquiry not found.' });
    }

    if (status === 'Pending' || status === 'Contacted') {
      enquiry.status = status;
      return res.json({ success: true, enquiry });
    }

    return res.status(400).json({ error: 'Invalid status' });
  });

  // Serve static client assets or run Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer();
