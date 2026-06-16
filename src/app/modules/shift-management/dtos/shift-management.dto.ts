import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class OpenShiftDTO {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  branchId: number;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  cashierId: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class EndShiftDTO {
  @ApiProperty({ example: 1250.75 })
  @IsNumber()
  @Min(0)
  endMoney: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
