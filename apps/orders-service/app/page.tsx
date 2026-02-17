export default function HomePage() {
  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui' }}>
      <h1>Orders Service</h1>
      <p>Status: Running</p>
      <p>Webhook endpoint: <code>/api/webhook</code></p>
      <p>This service processes checkout commands and creates orders.</p>
    </div>
  );
}
