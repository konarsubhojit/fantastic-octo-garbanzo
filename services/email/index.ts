import { createConsumer } from '../shared/consumer';
import { ensureTopicsExist } from '../shared/admin';
import { TOPICS } from '../shared/kafka';
import { OrderCreatedEvent } from '../shared/types';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// ─── SMTP Configuration ──────────────────────────────────
// Set these environment variables to enable real email sending:
// - SMTP_HOST: SMTP server hostname (e.g., smtp.gmail.com)
// - SMTP_PORT: SMTP port (default: 587)
// - SMTP_SECURE: Use TLS (default: false for port 587)
// - SMTP_USER: SMTP username/email
// - SMTP_PASS: SMTP password or app-specific password
// - EMAIL_FROM: Sender email address

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number.parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@ecommerce-store.com';

const isSmtpConfigured = SMTP_HOST && SMTP_USER && SMTP_PASS;

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!isSmtpConfigured) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
    console.log(`[Email Service] SMTP transporter configured for ${SMTP_HOST}:${SMTP_PORT}`);
  }

  return transporter;
}

// ─── Email Sending ───────────────────────────────────────

async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html: string
): Promise<boolean> {
  const transport = getTransporter();

  if (!transport) {
    // Fallback: log to console when SMTP is not configured
    console.log('[Email Service] ========== EMAIL (MOCK) ==========');
    console.log(`[Email Service] To: ${to}`);
    console.log(`[Email Service] Subject: ${subject}`);
    console.log(`[Email Service] Body:`);
    console.log(text);
    console.log('[Email Service] ==================================');
    return true;
  }

  try {
    const info = await transport.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      text,
      html,
    });
    console.log(`[Email Service] Email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('[Email Service] Failed to send email:', error);
    return false;
  }
}

// ─── Order Confirmation Handler ──────────────────────────

async function handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
  const { orderId, customerName, customerEmail, items, totalAmount } = event.payload;

  console.log(`[Email Service] Sending order confirmation for order ${orderId}`);

  const subject = `Order Confirmation - ${orderId}`;
  const textContent = formatOrderEmailText(orderId, customerName, items, totalAmount);
  const htmlContent = formatOrderEmailHtml(orderId, customerName, items, totalAmount);

  const success = await sendEmail(customerEmail, subject, textContent, htmlContent);

  if (success) {
    console.log(`[Email Service] Order confirmation sent to ${customerEmail} for order ${orderId}`);
  } else {
    console.error(`[Email Service] Failed to send confirmation to ${customerEmail} for order ${orderId}`);
  }
}

// ─── Email Templates ─────────────────────────────────────

function formatOrderEmailText(
  orderId: string,
  customerName: string,
  items: OrderCreatedEvent['payload']['items'],
  totalAmount: number
): string {
  const itemLines = items
    .map(
      (item, i) =>
        `  ${i + 1}. Product: ${item.productName || item.productId} | Qty: ${item.quantity} | Price: $${item.price.toFixed(2)}`
    )
    .join('\n');

  return `
Dear ${customerName},

Thank you for your order! Here are your order details:

Order ID: ${orderId}

Items:
${itemLines}

Total: $${totalAmount.toFixed(2)}

Your order is being processed and you will receive shipping updates soon.

Best regards,
E-Commerce Store
`.trim();
}

function formatOrderEmailHtml(
  orderId: string,
  customerName: string,
  items: OrderCreatedEvent['payload']['items'],
  totalAmount: number
): string {
  const itemRows = items
    .map(
      (item) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.productName || item.productId}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
        </tr>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0;">Order Confirmation</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px;">
    <p>Dear <strong>${customerName}</strong>,</p>
    <p>Thank you for your order! Here are your order details:</p>
    
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0;"><strong>Order ID:</strong> ${orderId}</p>
    </div>
    
    <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px;">
      <thead>
        <tr style="background: #667eea; color: white;">
          <th style="padding: 12px; text-align: left;">Product</th>
          <th style="padding: 12px; text-align: center;">Qty</th>
          <th style="padding: 12px; text-align: right;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
      <tfoot>
        <tr style="background: #f0f0f0;">
          <td colspan="2" style="padding: 12px; font-weight: bold;">Total</td>
          <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 1.2em;">$${totalAmount.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
    
    <p style="margin-top: 20px;">Your order is being processed and you will receive shipping updates soon.</p>
    
    <p style="margin-top: 30px; color: #666;">
      Best regards,<br>
      <strong>E-Commerce Store</strong>
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
    <p>This is an automated message. Please do not reply to this email.</p>
  </div>
</body>
</html>
`.trim();
}

async function start(): Promise<void> {
  console.log('[Email Service] Starting...');
  await ensureTopicsExist();

  await createConsumer({
    groupId: 'email-service',
    topics: [TOPICS.ORDER_EVENTS],
    handler: async ({ message }) => {
      if (!message.value) return;

      const event = JSON.parse(message.value.toString()) as OrderCreatedEvent;

      if (event.eventType === 'order.created') {
        await handleOrderCreated(event);
      }
    },
  });

  console.log('[Email Service] Running and consuming order-events');
}

try {
  await start();
} catch (err) {
  console.error('[Email Service] Fatal error:', err);
  process.exit(1);
}
