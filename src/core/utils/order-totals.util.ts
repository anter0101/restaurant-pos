import { BadRequestException } from '@nestjs/common';
import { OrderType } from 'src/core/enums/order-type';

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export type OrderTotals = {
  itemsSubtotal: number;
  deliveryFees: number;
  serviceFee: number;
  totalAmount: number;
};

export function assertMoneyEquals(
  clientValue: number,
  serverValue: number,
  fieldName: string,
): void {
  const client = roundMoney(clientValue);
  const server = roundMoney(serverValue);
  if (client !== server) {
    throw new BadRequestException(
      `${fieldName} mismatch: client sent ${client}, expected ${server}`,
    );
  }
}

export function assertOrderTotalsMatch(
  client: OrderTotals,
  server: OrderTotals,
): void {
  assertMoneyEquals(client.itemsSubtotal, server.itemsSubtotal, 'itemsSubtotal');
  assertMoneyEquals(client.deliveryFees, server.deliveryFees, 'deliveryFees');
  assertMoneyEquals(client.serviceFee, server.serviceFee, 'serviceFee');
  assertMoneyEquals(client.totalAmount, server.totalAmount, 'totalAmount');
}

export function calculateItemsSubtotalFromLines(
  items: { unitPrice: number; quantity: number }[],
): number {
  return roundMoney(
    items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
  );
}

export function calculateServiceFee(
  orderType: OrderType,
  itemsSubtotal: number,
  servicePercentage: number,
): number {
  if (orderType !== OrderType.DINE_IN) {
    return 0;
  }
  return roundMoney(itemsSubtotal * servicePercentage);
}

export function calculateTotalAmount(
  itemsSubtotal: number,
  deliveryFees: number,
  serviceFee: number,
): number {
  return roundMoney(itemsSubtotal + deliveryFees + serviceFee);
}

export function resolveMenuItemUnitPrice(
  menuItemId: number,
  defaultPrice: number,
  priceByMenuItemId: Map<number, number>,
): number {
  return priceByMenuItemId.get(menuItemId) ?? defaultPrice;
}
