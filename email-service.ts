import { Resend } from 'resend';
import { Enquiry } from './src/types';

let resendClient: Resend | null = null;

export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export async function sendEnquiryEmails(enquiry: Enquiry): Promise<void> {
  const client = getResendClient();
  if (!client) {
    console.warn('⚠️ Resend: RESEND_API_KEY is not configured. Email notification skipped.');
    return;
  }

  // Domain omyra.org is verified by the user
  const senderEmail = 'enquiry@omyra.org';
  const adminEmail = 'matrixgyan88094@gmail.com';

  try {
    // 1. Email to the Admin (the store manager)
    await client.emails.send({
      from: `CURATED Marketplace <${senderEmail}>`,
      to: adminEmail,
      subject: `🚨 New Purchase Enquiry: ${enquiry.productName} [Ref: ${enquiry.id}]`,
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 16px; background-color: #faf9f6; color: #1c1917;">
          <div style="text-align: center; border-bottom: 1px solid #e5e5e5; padding-bottom: 16px; margin-bottom: 24px;">
            <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; color: #78716c;">Administrative Console Notification</span>
            <h2 style="margin: 8px 0 0 0; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; color: #ff6b35;">NEW ACQUISITION INQUIRY</h2>
          </div>
          
          <div style="background-color: #ffffff; padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #e5e5e5;">
            <h3 style="margin-top: 0; font-size: 13px; font-weight: 800; text-transform: uppercase; color: #1c1917; border-bottom: 1px solid #f5f5f4; padding-bottom: 8px;">Client Profile</h3>
            <table style="width: 100%; font-size: 14px; border-collapse: collapse; line-height: 1.6;">
              <tr>
                <td style="padding: 6px 0; font-weight: bold; color: #78716c; width: 120px;">Full Name:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #1c1917;">${enquiry.firstName} ${enquiry.lastName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold; color: #78716c;">Email:</td>
                <td style="padding: 6px 0;"><a href="mailto:${enquiry.email}" style="color: #ff6b35; font-weight: 700; text-decoration: none;">${enquiry.email}</a></td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold; color: #78716c;">Phone:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #1c1917;">${enquiry.phone}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #ffffff; padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #e5e5e5;">
            <h3 style="margin-top: 0; font-size: 13px; font-weight: 800; text-transform: uppercase; color: #1c1917; border-bottom: 1px solid #f5f5f4; padding-bottom: 8px;">Product Specifications</h3>
            <div style="display: flex; align-items: center; gap: 16px; margin-top: 12px;">
              <img src="${enquiry.productThumbnail}" alt="${enquiry.productName}" style="width: 64px; height: 64px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e5e5; background-color: #f5f5f4;" />
              <div>
                <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #ff6b35; letter-spacing: 0.1em;">${enquiry.productCategory}</span>
                <h4 style="margin: 2px 0; font-size: 15px; font-weight: 700; color: #1c1917;">${enquiry.productName}</h4>
                <strong style="color: #ff6b35; font-size: 14px; font-family: monospace;">$${enquiry.productPrice}</strong>
              </div>
            </div>
          </div>

          <div style="background-color: #ffffff; padding: 20px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #e5e5e5;">
            <h3 style="margin-top: 0; font-size: 13px; font-weight: 800; text-transform: uppercase; color: #1c1917; border-bottom: 1px solid #f5f5f4; padding-bottom: 8px;">Supplied Message</h3>
            <p style="font-style: italic; font-size: 14px; color: #44403c; line-height: 1.6; margin: 8px 0 0 0; white-space: pre-wrap;">
              "${enquiry.message ? enquiry.message : 'No supplementary commentary entered.'}"
            </p>
          </div>

          <div style="text-align: center; margin-top: 32px; border-top: 1px solid #e5e5e5; padding-top: 16px;">
            <a href="https://omyra.org" style="font-size: 11px; font-weight: 700; color: #a8a29e; text-decoration: none; letter-spacing: 0.1em;">CURATED • OMYRA.ORG</a>
            <p style="font-size: 10px; color: #a8a29e; margin: 4px 0 0 0;">Reference ID: ${enquiry.id}</p>
          </div>
        </div>
      `,
    });

    // 2. Receipt Acknowledgement to the Customer
    await client.emails.send({
      from: `CURATED Studio <${senderEmail}>`,
      to: enquiry.email,
      subject: `Thank you for your enquiry on ${enquiry.productName} — CURATED`,
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e5e5e5; border-radius: 16px; background-color: #ffffff; color: #1c1917;">
          <div style="border-bottom: 1px solid #f5f5f4; padding-bottom: 24px; margin-bottom: 24px;">
            <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em; color: #ff6b35;">CURATED DESIGN STUDIO</span>
            <h2 style="margin: 8px 0 0 0; font-size: 24px; font-weight: 800; letter-spacing: -0.03em; color: #1c1917; text-transform: uppercase;">Acknowledge Receipt</h2>
          </div>
          
          <p style="font-size: 15px; line-height: 1.6; color: #44403c; margin-bottom: 16px;">
            Hello ${enquiry.firstName},
          </p>
          
          <p style="font-size: 15px; line-height: 1.6; color: #44403c; margin-bottom: 24px;">
            We have safely received your purchase consultation request for the <strong>${enquiry.productName}</strong>. 
            Because we deliberately reject automated, impersonal transactional shopping carts in favor of deep design craftsmanship, a studio representative has been allocated to your file.
          </p>

          <div style="background-color: #faf9f6; padding: 20px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #e5e5e5;">
            <h4 style="margin-top: 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #ff6b35; margin-bottom: 12px;">Enquiry Specifications</h4>
            <table style="width: 100%; font-size: 14px; border-collapse: collapse; line-height: 1.6;">
              <tr>
                <td style="padding: 4px 0; color: #78716c;">Piece Selected:</td>
                <td style="padding: 4px 0; font-weight: 700; color: #1c1917;">${enquiry.productName}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #78716c;">Acquisition Value:</td>
                <td style="padding: 4px 0; font-weight: 700; color: #ff6b35; font-family: monospace;">$${enquiry.productPrice}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #78716c;">Reference Registry:</td>
                <td style="padding: 4px 0; font-family: monospace; color: #78716c;">${enquiry.id}</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 15px; line-height: 1.6; color: #44403c; margin-bottom: 24px;">
            Our team is preparing physical inspection certificates, courier insurance rates, and private payment routes. We will contact you at <strong>${enquiry.phone}</strong> or by replying directly to this email chain.
          </p>

          <p style="font-size: 15px; line-height: 1.6; color: #ff6b35; font-weight: 800; margin: 32px 0 0 0;">
            Sincerely,<br />
            <span style="color: #1c1917; font-size: 14px; font-weight: 700;">The CURATED Studio Registry</span>
          </p>

          <div style="text-align: center; margin-top: 40px; border-top: 1px solid #f5f5f4; padding-top: 16px;">
            <p style="font-size: 11px; color: #a8a29e; margin: 0;">CURATED • omyra.org</p>
          </div>
        </div>
      `,
    });

    console.log(`✅ Resend: Dispatched dual client and admin emails for enquiry ${enquiry.id}.`);
  } catch (err: any) {
    console.error(`❌ Resend: Failed to transmit email notification:`, err.message);
  }
}
