import { DateRangeWindowConstraint } from './date-range';

describe('DateRangeWindowConstraint', () => {
  const constraint = new DateRangeWindowConstraint();

  function check(from?: string, to?: string): boolean {
    return constraint.validate(undefined, {
      object: { from, to },
    } as any);
  }

  it('allows both dates omitted', () => {
    expect(check(undefined, undefined)).toBe(true);
  });

  it('rejects a single bound', () => {
    expect(check('2026-10-01T00:00:00.000Z', undefined)).toBe(false);
  });

  it('rejects from after to', () => {
    expect(check('2026-10-31T00:00:00.000Z', '2026-10-01T00:00:00.000Z')).toBe(
      false,
    );
  });

  it('accepts a valid window', () => {
    expect(check('2026-10-01T00:00:00.000Z', '2026-10-31T23:59:59.999Z')).toBe(
      true,
    );
  });

  it('rejects more than 366 days', () => {
    expect(check('2025-01-01T00:00:00.000Z', '2026-12-31T00:00:00.000Z')).toBe(
      false,
    );
  });
});
