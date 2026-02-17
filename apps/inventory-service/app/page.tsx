export default function HomePage() {
  const webhookUrl = process.env.NEXT_PUBLIC_INVENTORY_SERVICE_URL || 'http://localhost:3003';
  
  return (
    <div style={{ 
      fontFamily: 'system-ui, sans-serif', 
      maxWidth: '800px', 
      margin: '2rem auto', 
      padding: '0 1rem' 
    }}>
      <h1>Inventory Service</h1>
      <p>
        Inventory management service that receives and logs inventory-related events. 
        This service processes inventory events from QStash.
      </p>

      <section style={{ marginTop: '2rem' }}>
        <h2>Service Status</h2>
        <p>✅ Service is running</p>
        <p><strong>Port:</strong> 3003</p>
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
          Receives inventory events from QStash and logs them
        </p>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Supported Events</h2>
        <ul>
          <li><code>inventory.stock.updated</code> - Stock level changes</li>
          <li><code>inventory.stock.low</code> - Low stock alerts</li>
          <li><code>inventory.stock.reserved</code> - Stock reservations</li>
        </ul>
      </section>
    </div>
  );
}
