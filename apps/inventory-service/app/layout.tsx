import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Inventory Service',
  description: 'Inventory management service for event-driven architecture',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
