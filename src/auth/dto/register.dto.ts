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
  firstName: string;

 @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  profileUrl?: string;

  @IsOptional()
  @IsMongoId()
  clientId?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
