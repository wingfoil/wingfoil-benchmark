export type OrderStatus = 'pending' | 'shipped';

export interface Order {
  readonly id: string;
  readonly status: OrderStatus;
}

export function ship(order: Order): Order {
  return { ...order, status: 'shipped' };
}
