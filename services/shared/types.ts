export interface PaymentSuccessEvent {
  eventId: string;
  eventType: 'payment.success';
  timestamp: string;
  payload: {
    userId: string;
    customerName: string;
    customerEmail: string;
    customerAddress: string;
    items: Array<{
      productId: string;
      variationId?: string;
      quantity: number;
      price: number;
    }>;
    totalAmount: number;
    paymentId: string;
  };
}

export interface OrderCreatedEvent {
  eventId: string;
  eventType: 'order.created';
  timestamp: string;
  payload: {
    orderId: string;
    userId: string;
    customerName: string;
    customerEmail: string;
    customerAddress: string;
    items: Array<{
      productId: string;
      variationId?: string;
      quantity: number;
      price: number;
      productName?: string;
    }>;
    totalAmount: number;
    status: string;
  };
}

export type KafkaEvent = PaymentSuccessEvent | OrderCreatedEvent;
