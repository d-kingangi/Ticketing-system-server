import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  MinLength,
  IsMongoId,
  IsBoolean,
} from 'class-validator';
import { UserRole } from 'src/auth/schema/user.schema';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsMongoId()
  clientId?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole = UserRole.PATIENT;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
