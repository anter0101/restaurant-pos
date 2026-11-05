export const ORDER_QUEUE_MIN = 0;
export const ORDER_QUEUE_MAX = 100;

/** Counter value after a shift ends or a new shift opens. */
export const ORDER_QUEUE_RESET = ORDER_QUEUE_MIN;

export interface OrderQueueAssignment {
  /** Queue number stored on the order (0–100). */
  assigned: number;
  /** Next counter value persisted on the branch. */
  next: number;
}

/**
 * Assigns the current queue number and computes the next counter.
 * After 100 the sequence wraps back to 0.
 */
export function assignNextOrderQueue(current: number): OrderQueueAssignment {
  const normalized = normalizeOrderQueueCounter(current);
  const assigned = normalized;
  const next =
    normalized >= ORDER_QUEUE_MAX ? ORDER_QUEUE_RESET : normalized + 1;
  return { assigned, next };
}

export function normalizeOrderQueueCounter(value: number): number {
  if (!Number.isInteger(value) || value < ORDER_QUEUE_MIN || value > ORDER_QUEUE_MAX) {
    return ORDER_QUEUE_RESET;
  }
  return value;
}

export function resetOrderQueueCounter(): number {
  return ORDER_QUEUE_RESET;
}
