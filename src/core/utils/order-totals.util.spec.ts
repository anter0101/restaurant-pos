import { BadRequestException } from '@nestjs/common';
import { OrderType } from 'src/core/enums/order-type';
import {
  assertMoneyEquals,
  assertOrderTotalsMatch,
  calculateItemsSubtotalFromLines,
  calculateServiceFee,
  calculateTotalAmount,
} from './order-totals.util';

describe('order-totals.util', () => {
  it('assertMoneyEquals passes when values match after rounding', () => {
    expect(() => assertMoneyEquals(10.555, 10.56, 'test')).not.toThrow();
  });

  it('assertMoneyEquals throws on mismatch', () => {
    expect(() => assertMoneyEquals(44, 45, 'totalAmount')).toThrow(
      BadRequestException,
    );
    expect(() => assertMoneyEquals(44, 45, 'totalAmount')).toThrow(
      /totalAmount mismatch/,
    );
  });

  it('assertOrderTotalsMatch validates all fields', () => {
    expect(() =>
      assertOrderTotalsMatch(
        { itemsSubtotal: 40, deliveryFees: 0, serviceFee: 4, totalAmount: 44 },
        { itemsSubtotal: 40, deliveryFees: 0, serviceFee: 4, totalAmount: 44 },
      ),
    ).not.toThrow();

    expect(() =>
      assertOrderTotalsMatch(
        { itemsSubtotal: 40, deliveryFees: 0, serviceFee: 4, totalAmount: 44 },
        { itemsSubtotal: 40, deliveryFees: 0, serviceFee: 0, totalAmount: 40 },
      ),
    ).toThrow(/serviceFee mismatch/);
  });

  it('calculateServiceFee applies only for DINE_IN', () => {
    expect(calculateServiceFee(OrderType.DINE_IN, 100, 0.1)).toBe(10);
    expect(calculateServiceFee(OrderType.TAKEAWAY, 100, 0.1)).toBe(0);
    expect(calculateServiceFee(OrderType.DELIVERY, 100, 0.1)).toBe(0);
  });

  it('calculateTotalAmount sums rounded parts', () => {
    expect(calculateTotalAmount(40, 5, 4)).toBe(49);
    expect(
      calculateItemsSubtotalFromLines([
        { unitPrice: 20, quantity: 2 },
        { unitPrice: 10, quantity: 1 },
      ]),
    ).toBe(50);
  });
});
