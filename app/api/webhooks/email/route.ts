import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { publishAuditLog } from '@/services/shared/producer';
import { EmailNotificationEvent, OrderItem, AppEvent } from '@/services/shared/types';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export const dynamic = 'force-dynamic';

// Initialize QStash receiver for signature verification
const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || '',
});

// ─── SMTP Configuration ──────────────────────────────────

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
    console.log(`[Email Webhook] SMTP transporter configured for ${SMTP_HOST}:${SMTP_PORT}`);
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
    console.log('[Email Webhook] ========== EMAIL (MOCK) ==========');
    console.log(`[Email Webhook] To: ${to}`);
    console.log(`[Email Webhook] Subject: ${subject}`);
    console.log(`[Email Webhook] Body:`);
    console.log(text);
    console.log('[Email Webhook] ==================================');
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
    console.log(`[Email Webhook] Email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('[Email Webhook] Failed to send email:', error);
    return false;
  }
}

// ─── Template Rendering ──────────────────────────────────

interface OrderConfirmationData {
  orderId: string;
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
}

function renderOrderConfirmationText(data: OrderConfirmationData): string {
  const itemLines = data.items
    .map(
      (item, i) =>
        `  ${i + 1}. Product: ${item.productName || item.productId} | Qty: ${item.quantity} | Price: $${item.price.toFixed(2)}`
    )
    .join('\n');

  return `
Dear ${data.customerName},

Thank you for your order! Here are your order details:

Order ID: ${data.orderId}

Items:
${itemLines}

Total: $${data.totalAmount.toFixed(2)}

Your order is being processed and you will receive shipping updates soon.

Best regards,
E-Commerce Store
`.trim();
}

function renderOrderConfirmationHtml(data: OrderConfirmationData): string {
  const itemRows = data.items
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
    <p>Dear <strong>${data.customerName}</strong>,</p>
    <p>Thank you for your order! Here are your order details:</p>
    
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0;"><strong>Order ID:</strong> ${data.orderId}</p>
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
          <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 1.2em;">$${data.totalAmount.toFixed(2)}</td>
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

// ─── Template Registry ───────────────────────────────────

type TemplateRenderer = (data: Record<string, unknown>) => { text: string; html: string };

const templates: Record<string, TemplateRenderer> = {
  'order-confirmation': (data) => ({
    text: renderOrderConfirmationText(data as unknown as OrderConfirmationData),
    html: renderOrderConfirmationHtml(data as unknown as OrderConfirmationData),
  }),
};

// ─── Notification Handler ────────────────────────────────

async function handleEmailNotification(event: EmailNotificationEvent): Promise<void> {
  const { to, subject, templateId, templateData, priority } = event.payload;
  const correlationId = event.correlationId;

  console.log(`[Email Webhook] Processing ${priority} priority email to ${to}: ${subject}`);

  // Render template
  const renderer = templates[templateId];
  if (!renderer) {
    console.error(`[Email Webhook] Unknown template: ${templateId}`);
    return;
  }

  const { text, html } = renderer(templateData);

  // Send email
  const success = await sendEmail(to, subject, text, html);

  // Audit log
  await publishAuditLog({
    action: success ? 'email.sent' : 'email.failed',
    entityType: 'email',
    entityId: event.eventId,
    metadata: {
      to,
      subject,
      templateId,
      priority,
    },
  }, correlationId);

  if (success) {
    console.log(`[Email Webhook] Email sent to ${to}`);
  } else {
    console.error(`[Email Webhook] Failed to send email to ${to}`);
  }
}

// ─── Webhook Handler ───────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Get request body and signature
    const body = await request.text();
    const signature = request.headers.get('upstash-signature');

    if (!signature) {
      console.error('[Email Webhook] Missing QStash signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    // Verify QStash signature
    try {
      const isValid = await receiver.verify({
        signature,
        body,
      });

      if (!isValid) {
        console.error('[Email Webhook] Invalid QStash signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } catch (error) {
      console.error('[Email Webhook] Signature verification failed:', error);
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
    }

    // Parse event
    const event: AppEvent = JSON.parse(body);
    const eventType = event.eventType;

    console.log(`[Email Webhook] Received event: ${eventType}`);

    // Route to appropriate handler
    if (eventType === 'notification.email') {
      await handleEmailNotification(event as EmailNotificationEvent);
      return NextResponse.json({ success: true, message: 'Email sent' });
    }

    console.log(`[Email Webhook] Unknown event type: ${eventType}`);
    return NextResponse.json({ success: true, message: 'Event ignored' });
  } catch (error) {
    console.error('[Email Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
