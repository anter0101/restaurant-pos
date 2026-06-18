import { BadRequestException } from '@nestjs/common';
import { BranchType } from 'src/core/enums/branch-type';
import { OrderType } from 'src/core/enums/order-type';

const ALLOWED_ORDER_TYPES: Record<BranchType, readonly OrderType[]> = {
  [BranchType.DINE_IN]: [
    OrderType.DINE_IN,
    OrderType.TAKEAWAY,
    OrderType.DELIVERY,
  ],
  [BranchType.TAKEAWAY]: [OrderType.TAKEAWAY, OrderType.DELIVERY],
};

export function assertOrderTypeAllowedForBranch(
  branchType: BranchType,
  orderType: OrderType,
): void {
  const allowed = ALLOWED_ORDER_TYPES[branchType];
  if (!allowed.includes(orderType)) {
    throw new BadRequestException(
      `Branch type ${branchType} cannot accept ${orderType} orders. Allowed: ${allowed.join(', ')}`,
    );
  }
}

export function assertDeliveryRegionMatchesOrderType(
  orderType: OrderType,
  deliveryRegionId?: number,
): void {
  if (orderType === OrderType.DELIVERY && !deliveryRegionId) {
    throw new BadRequestException(
      'deliveryRegionId is required for DELIVERY orders',
    );
  }
  if (orderType !== OrderType.DELIVERY && deliveryRegionId) {
    throw new BadRequestException(
      `deliveryRegionId is only allowed for DELIVERY orders, not ${orderType}`,
    );
  }
}

export function getAllowedOrderTypesForBranch(
  branchType: BranchType,
): readonly OrderType[] {
  return ALLOWED_ORDER_TYPES[branchType];
}
