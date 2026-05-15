import { ValueTransformer } from 'typeorm';

/**
 * Many DB drivers expose DECIMAL/NUMERIC as strings. Coerce to number for TS + JSON payloads.
 */
export const decimalNumberTransformer: ValueTransformer = {
  to: (value: number): number => value,
  from: (value: string | number): number =>
    typeof value === 'number' ? value : parseFloat(String(value)),
};
