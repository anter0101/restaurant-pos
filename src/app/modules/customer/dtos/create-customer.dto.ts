import { ApiProperty, OmitType } from '@nestjs/swagger';
import { CustomerDTO } from './customer.dto';

export class CreateCustomerDTO extends OmitType(CustomerDTO, ['id'] as const) {}
