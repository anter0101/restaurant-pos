import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export type MutuallyExclusivePayloadPredicates<T extends object = object> = {
  /** When true together with `second`, validation fails — exactly one branch must apply. */
  first: (object: T) => boolean;

  /** XOR partner of `first`. */
  second: (object: T) => boolean;
};

/**
 * True when exactly one of `first(object)` / `second(object)` is true.
 * Useful in services or tests; pair with {@link createMutuallyExclusivePayloadConstraint} for DTOs.
 */
export function isExactlyOnePayloadShape<T extends object>(
  object: T,
  predicates: MutuallyExclusivePayloadPredicates<T>,
): boolean {
  const a = predicates.first(object);
  const b = predicates.second(object);
  return a !== b;
}

/**
 * Reusable XOR constraint for class-validator.
 * Apply on a dedicated optional property (not on the class): `@Validate(MyConstraintClass)`,
 * and read `args.object` in `validate()` so the rule applies to the whole DTO.
 *
 * @example
 * ```ts
 * const InvoicePayloadXorConstraint = createMutuallyExclusivePayloadConstraint(
 *   'invoiceLinesXor',
 *   {
 *     first: (o) => o.line != null,
 *     second: (o) => Array.isArray(o.lines) && o.lines.length > 0,
 *   },
 *   'Send either line or lines, not both',
 * );
 *
 * export class CreateInvoiceDTO {
 *   line?: InvoiceLineDTO;
 *   lines?: InvoiceLineDTO[];
 *
 *   @Allow()
 *   @IsOptional()
 *   @Validate(InvoicePayloadXorConstraint)
 *   _XorShape?: unknown;
 * }
 * ```
 */
export function createMutuallyExclusivePayloadConstraint<T extends object>(
  constraintName: string,
  predicates: MutuallyExclusivePayloadPredicates<T>,
  defaultValidationMessage: string,
): new () => ValidatorConstraintInterface {
  @ValidatorConstraint({ name: constraintName, async: false })
  class MutuallyExclusivePayloadConstraint implements ValidatorConstraintInterface {
    validate(_value: unknown, args: ValidationArguments): boolean {
      return isExactlyOnePayloadShape(args.object as T, predicates);
    }

    defaultMessage(): string {
      return defaultValidationMessage;
    }
  }

  return MutuallyExclusivePayloadConstraint;
}
