import { OrderType } from 'src/core/enums/order-type';
import {
  assertDeliveryRegionMatchesOrderType,
  assertOrderTypeAllowedForBranch,
  getAllowedOrderTypesForBranch,
} from './order-type.util';
import { BranchType } from 'src/core/enums/branch-type';

describe('order-type.util', () => {
  describe('assertOrderTypeAllowedForBranch', () => {
    it('DINE_IN branch accepts dine-in, takeaway, and delivery', () => {
      expect(() =>
        assertOrderTypeAllowedForBranch(BranchType.DINE_IN, OrderType.DINE_IN),
      ).not.toThrow();
      expect(() =>
        assertOrderTypeAllowedForBranch(BranchType.DINE_IN, OrderType.TAKEAWAY),
      ).not.toThrow();
      expect(() =>
        assertOrderTypeAllowedForBranch(BranchType.DINE_IN, OrderType.DELIVERY),
      ).not.toThrow();
    });

    it('TAKEAWAY branch accepts takeaway and delivery only', () => {
      expect(() =>
        assertOrderTypeAllowedForBranch(BranchType.TAKEAWAY, OrderType.TAKEAWAY),
      ).not.toThrow();
      expect(() =>
        assertOrderTypeAllowedForBranch(BranchType.TAKEAWAY, OrderType.DELIVERY),
      ).not.toThrow();
    });

    it('TAKEAWAY branch rejects dine-in orders', () => {
      expect(() =>
        assertOrderTypeAllowedForBranch(BranchType.TAKEAWAY, OrderType.DINE_IN),
      ).toThrow(/cannot accept DINE_IN orders/);
    });
  });

  describe('assertDeliveryRegionMatchesOrderType', () => {
    it('requires deliveryRegionId for DELIVERY', () => {
      expect(() =>
        assertDeliveryRegionMatchesOrderType(OrderType.DELIVERY),
      ).toThrow(/deliveryRegionId is required/);
    });

    it('rejects deliveryRegionId for non-delivery orders', () => {
      expect(() =>
        assertDeliveryRegionMatchesOrderType(OrderType.DINE_IN, 1),
      ).toThrow(/only allowed for DELIVERY orders/);
    });
  });

  describe('getAllowedOrderTypesForBranch', () => {
    it('returns correct lists', () => {
      expect(getAllowedOrderTypesForBranch(BranchType.DINE_IN)).toEqual([
        OrderType.DINE_IN,
        OrderType.TAKEAWAY,
        OrderType.DELIVERY,
      ]);
      expect(getAllowedOrderTypesForBranch(BranchType.TAKEAWAY)).toEqual([
        OrderType.TAKEAWAY,
        OrderType.DELIVERY,
      ]);
    });
  });
});
