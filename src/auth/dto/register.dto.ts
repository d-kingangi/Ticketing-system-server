// src/auth/dto/register.dto.ts
import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  MinLength,
  IsMongoId,
} from 'class-validator';
import { UserRole } from '../schema/user.schema';

export class RegisterDto {
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
  role?: UserRole;
}
