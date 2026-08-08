import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
export class RequestShiftManagementDTO { 

    @IsString()
    @IsNotEmpty()   
    @MinLength(3)
    @MaxLength(20)
    username!: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(20)
    password!: string;
}