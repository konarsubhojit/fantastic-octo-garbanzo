export default function HomePage() {
  const webhookUrl = process.env.NEXT_PUBLIC_EMAIL_SERVICE_URL || 'http://localhost:3002';
  
  return (
    <div style={{ 
      fontFamily: 'system-ui, sans-serif', 
      maxWidth: '800px', 
      margin: '2rem auto', 
      padding: '0 1rem' 
    }}>
      <h1>Email Service</h1>
      <p>
        Email notification service that handles outgoing emails via SMTP. 
        This service processes <code>notification.email</code> events from QStash.
      </p>

      <section style={{ marginTop: '2rem' }}>
        <h2>Service Status</h2>
        <p>✅ Service is running</p>
        <p><strong>Port:</strong> 3002</p>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Webhook Endpoint</h2>
        <code style={{ 
          display: 'block', 
          padding: '1rem', 
          backgroundColor: '#f5f5f5', 
          borderRadius: '4px',
          overflowX: 'auto'
        }}>
          POST {webhookUrl}/api/webhook
        </code>
        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
          Receives notification.email events from QStash and sends emails via SMTP
        </p>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Supported Events</h2>
        <ul>
          <li><code>notification.email</code> - Send email via SMTP</li>
        </ul>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Email Templates</h2>
        <ul>
          <li><code>order-confirmation</code> - Order confirmation email</li>
        </ul>
      </section>
    </div>
  );
}
