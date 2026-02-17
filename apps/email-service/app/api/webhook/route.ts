import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { randomUUID } from 'node:crypto';
import { handleCorsPreflightRequest, corsResponse } from '@/services/shared/cors';
import type { EmailNotificationEvent, AppEvent, OrderItem } from '@/services/shared/types';

export const dynamic = 'force-dynamic';

// Initialize QStash receiver for signature verification
const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || '',
});

// Email transporter (lazy initialized)
let transporter: Transporter | null = null;

function getEmailTransporter(): Transporter | null {
  if (transporter) return transporter;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
    console.warn('[Email Service] SMTP not configured, will use mock mode');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort, 10),
    secure: parseInt(smtpPort, 10) === 465,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });

  return transporter;
}

// Publisher helper - sends events back to QStash
async function publishEvent(url: string, event: AppEvent): Promise<void> {
  const QSTASH_TOKEN = process.env.QSTASH_TOKEN;
  if (!QSTASH_TOKEN) {
    console.warn('[Email Service] QSTASH_TOKEN not set, skipping publish');
    return;
  }

  const response = await fetch('https://qstash.upstash.io/v2/publish/' + encodeURIComponent(url), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${QSTASH_TOKEN}`,
      'Content-Type': 'application/json',
      'Upstash-Forward-X-Event-Type': event.eventType,
      'Upstash-Forward-X-Event-Id': event.eventId,
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    throw new Error(`Failed to publish event: ${response.statusText}`);
  }
}

// ─── Email Template Registry ───────────────────────────────────

interface EmailTemplate {
  subject: (data: Record<string, unknown>) => string;
  text: (data: Record<string, unknown>) => string;
  html: (data: Record<string, unknown>) => string;
}

const emailTemplates: Record<string, EmailTemplate> = {
  'order-confirmation': {
    subject: (data) => `Order Confirmation - ${data.orderId}`,
    text: renderOrderConfirmationText,
    html: renderOrderConfirmationHtml,
  },
};

// ─── Email Template Renderers ──────────────────────────────────

function renderOrderConfirmationText(data: Record<string, unknown>): string {
  const { orderId, customerName, items, totalAmount } = data;
  const itemsList = (items as OrderItem[])
    .map((item) => `  - ${item.productName || item.productId} x${item.quantity} @ $${item.price.toFixed(2)}`)
    .join('\n');

  return `
Hello ${customerName},

Thank you for your order! Your order has been received and is being processed.

Order ID: ${orderId}
Items:
${itemsList}

Total: $${(totalAmount as number).toFixed(2)}

You will receive another email when your order ships.

Thank you for shopping with us!
  `.trim();
}

function renderOrderConfirmationHtml(data: Record<string, unknown>): string {
  const { orderId, customerName, items, totalAmount } = data;
  const itemsRows = (items as OrderItem[])
    .map(
      (item) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.productName || item.productId}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${item.price.toFixed(2)}</td>
    </tr>
  `
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
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="color: #2c3e50; margin: 0;">Order Confirmation</h1>
  </div>
  
  <p>Hello <strong>${customerName}</strong>,</p>
  
  <p>Thank you for your order! Your order has been received and is being processed.</p>
  
  <div style="background-color: #fff; border: 1px solid #ddd; border-radius: 4px; padding: 15px; margin: 20px 0;">
    <p style="margin: 0 0 10px 0;"><strong>Order ID:</strong> ${orderId}</p>
  </div>
  
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <thead>
      <tr style="background-color: #f8f9fa;">
        <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
        <th style="padding: 12px 8px; text-align: center; border-bottom: 2px solid #ddd;">Quantity</th>
        <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
    <tfoot>
      <tr style="background-color: #f8f9fa; font-weight: bold;">
        <td colspan="2" style="padding: 12px 8px; text-align: right; border-top: 2px solid #ddd;">Total:</td>
        <td style="padding: 12px 8px; text-align: right; border-top: 2px solid #ddd;">$${(totalAmount as number).toFixed(2)}</td>
      </tr>
    </tfoot>
  </table>
  
  <p>You will receive another email when your order ships.</p>
  
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 0.9em;">
    <p>Thank you for shopping with us!</p>
  </div>
</body>
</html>
  `.trim();
}

// ─── Email Notification Handler ────────────────────────────────

async function handleEmailNotification(event: EmailNotificationEvent): Promise<void> {
  const { to, templateId, templateData, priority } = event.payload;
  const correlationId = event.correlationId || event.eventId;

  console.log(`[Email Service] Sending ${templateId} email to ${to} (priority: ${priority})`);

  // Get template
  const template = emailTemplates[templateId];
  if (!template) {
    console.error(`[Email Service] Unknown template: ${templateId}`);
    throw new Error(`Unknown email template: ${templateId}`);
  }

  // Render email
  const subject = template.subject(templateData);
  const text = template.text(templateData);
  const html = template.html(templateData);

  // Get transporter
  const mailer = getEmailTransporter();

  if (mailer) {
    // Send real email
    try {
      const info = await mailer.sendMail({
        from: process.env.SMTP_FROM || 'noreply@example.com',
        to,
        subject,
        text,
        html,
      });
      console.log(`[Email Service] Email sent successfully: ${info.messageId}`);
    } catch (error) {
      console.error('[Email Service] Failed to send email:', error);
      throw error;
    }
  } else {
    // Mock mode - just log
    console.log('[Email Service] MOCK MODE - Email would be sent:');
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Template: ${templateId}`);
    console.log(`  Priority: ${priority}`);
  }

  // Publish audit log
  const auditEvent = {
    eventId: randomUUID(),
    eventType: 'analytics.audit' as const,
    timestamp: new Date().toISOString(),
    version: '1.0' as const,
    source: 'email-service',
    correlationId,
    payload: {
      action: 'email.sent',
      entityType: 'email',
      entityId: event.eventId,
      metadata: {
        to,
        templateId,
        priority,
        mockMode: !mailer,
        correlationId,
      },
    },
  };

  await publishEvent(process.env.QSTASH_ANALYTICS_URL || '', auditEvent);
}

// ─── HTTP Handlers ─────────────────────────────────────────────

// OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request);
}

// GET handler for health check
export async function GET(request: NextRequest) {
  const smtpConfigured = !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD
  );

  return corsResponse(
    {
      status: 'healthy',
      service: 'email',
      timestamp: new Date().toISOString(),
      smtpConfigured,
      mockMode: !smtpConfigured,
    },
    200,
    request
  );
}

// POST handler for webhook
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('upstash-signature');

    if (!signature) {
      console.error('[Email Service] Missing QStash signature');
      return corsResponse({ error: 'Missing signature' }, 401, request);
    }

    // Verify QStash signature
    try {
      const isValid = await receiver.verify({
        signature,
        body,
      });

      if (!isValid) {
        console.error('[Email Service] Invalid QStash signature');
        return corsResponse({ error: 'Invalid signature' }, 401, request);
      }
    } catch (error) {
      console.error('[Email Service] Signature verification failed:', error);
      return corsResponse({ error: 'Signature verification failed' }, 401, request);
    }

    // Parse event
    const event: AppEvent = JSON.parse(body);
    const eventType = event.eventType;

    console.log(`[Email Service] Received event: ${eventType}`);

    // Route to appropriate handler
    if (eventType === 'notification.email') {
      await handleEmailNotification(event as EmailNotificationEvent);
      return corsResponse({ success: true, message: 'Email notification processed' }, 200, request);
    }

    console.log(`[Email Service] Unknown event type: ${eventType}`);
    return corsResponse({ success: true, message: 'Event ignored' }, 200, request);
  } catch (error) {
    console.error('[Email Service] Error processing webhook:', error);
    return corsResponse(
      { error: 'Failed to process webhook', details: error instanceof Error ? error.message : 'Unknown error' },
      500,
      request
    );
  }
}
