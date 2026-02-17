export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Analytics Service</h1>
      <p>Logging and monitoring service for event analysis.</p>
      
      <h2>Supported Events</h2>
      <ul>
        <li>
          <strong>analytics.audit</strong> - Audit log entries for compliance and security tracking
        </li>
        <li>
          <strong>analytics.metric</strong> - Business metrics for performance monitoring and analysis
        </li>
        <li>
          <strong>analytics.dlq</strong> - Dead letter queue events for error tracking and debugging
        </li>
      </ul>

      <h2>Webhook Endpoint</h2>
      <p>
        <code>/api/webhook</code> - Receives and logs analytics events
      </p>

      <h2>Status</h2>
      <p>Service is running and ready to receive events.</p>
    </div>
  );
}
