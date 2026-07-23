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
  submittedValue: number,
  serverValue: number,
  fieldName: string,
): void {
  const submitted = roundMoney(submittedValue);
  const server = roundMoney(serverValue);
  if (submitted !== server) {
    throw new BadRequestException(
      `${fieldName} mismatch: POS sent ${submitted}, expected ${server}`,
    );
  }
}

export function assertOrderTotalsMatch(
  submitted: OrderTotals,
  server: OrderTotals,
): void {
  assertMoneyEquals(submitted.itemsSubtotal, server.itemsSubtotal, 'itemsSubtotal');
  assertMoneyEquals(submitted.deliveryFees, server.deliveryFees, 'deliveryFees');
  assertMoneyEquals(submitted.serviceFee, server.serviceFee, 'serviceFee');
  assertMoneyEquals(submitted.totalAmount, server.totalAmount, 'totalAmount');
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
