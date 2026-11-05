import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

export const MAX_DATE_RANGE_DAYS = 366;
const MAX_DATE_RANGE_MS = MAX_DATE_RANGE_DAYS * 24 * 60 * 60 * 1000;

@ValidatorConstraint({ name: 'dateRangeWindow', async: false })
export class DateRangeWindowConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const obj = args.object as { from?: string; to?: string };
    if (obj.from == null && obj.to == null) {
      return true;
    }
    if (obj.from == null || obj.to == null) {
      return false;
    }
    const from = Date.parse(obj.from);
    const to = Date.parse(obj.to);
    if (Number.isNaN(from) || Number.isNaN(to)) {
      return false;
    }
    if (from > to) {
      return false;
    }
    return to - from <= MAX_DATE_RANGE_MS;
  }

  defaultMessage(): string {
    return `from and to must both be set, from <= to, and at most ${MAX_DATE_RANGE_DAYS} days apart`;
  }
}

export class DateRangeQueryDTO {
  @ApiProperty({
    required: false,
    example: '2026-10-01T00:00:00.000Z',
    description: 'Inclusive range start (ISO 8601). Send start of day from the POS timezone.',
  })
  @Validate(DateRangeWindowConstraint)
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiProperty({
    required: false,
    example: '2026-10-31T23:59:59.999Z',
    description: 'Inclusive range end (ISO 8601). Send end of day from the POS timezone.',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class RequiredDateRangeQueryDTO {
  @ApiProperty({
    example: '2026-10-01T00:00:00.000Z',
    description: 'Inclusive range start (ISO 8601). Send start of day from the POS timezone.',
  })
  @Validate(DateRangeWindowConstraint)
  @IsDateString()
  from!: string;

  @ApiProperty({
    example: '2026-10-31T23:59:59.999Z',
    description: 'Inclusive range end (ISO 8601). Send end of day from the POS timezone.',
  })
  @IsDateString()
  to!: string;
}

export function parseDateRange(
  from: string,
  to: string,
): { from: Date; to: Date } {
  return { from: new Date(from), to: new Date(to) };
}
