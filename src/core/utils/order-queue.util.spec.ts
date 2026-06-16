import {
  ORDER_QUEUE_MAX,
  ORDER_QUEUE_RESET,
  assignNextOrderQueue,
  normalizeOrderQueueCounter,
  resetOrderQueueCounter,
} from './order-queue.util';

describe('order-queue.util', () => {
  describe('assignNextOrderQueue', () => {
    it('assigns 0 and advances to 1 when counter is 0', () => {
      expect(assignNextOrderQueue(0)).toEqual({ assigned: 0, next: 1 });
    });

    it('assigns 99 and advances to 100', () => {
      expect(assignNextOrderQueue(99)).toEqual({ assigned: 99, next: 100 });
    });

    it('assigns 100 and wraps counter back to 0', () => {
      expect(assignNextOrderQueue(100)).toEqual({ assigned: 100, next: 0 });
    });

    it('normalizes invalid counter before assigning', () => {
      expect(assignNextOrderQueue(-5)).toEqual({ assigned: 0, next: 1 });
      expect(assignNextOrderQueue(150)).toEqual({ assigned: 0, next: 1 });
    });
  });

  describe('normalizeOrderQueueCounter', () => {
    it('accepts values within 0–100', () => {
      expect(normalizeOrderQueueCounter(0)).toBe(0);
      expect(normalizeOrderQueueCounter(ORDER_QUEUE_MAX)).toBe(100);
    });

    it('resets out-of-range values to 0', () => {
      expect(normalizeOrderQueueCounter(-1)).toBe(ORDER_QUEUE_RESET);
      expect(normalizeOrderQueueCounter(101)).toBe(ORDER_QUEUE_RESET);
      expect(normalizeOrderQueueCounter(1.5)).toBe(ORDER_QUEUE_RESET);
    });
  });

  describe('resetOrderQueueCounter', () => {
    it('returns 0', () => {
      expect(resetOrderQueueCounter()).toBe(0);
    });
  });
});
