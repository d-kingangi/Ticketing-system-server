import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
  IsMongoId,
  IsBoolean,
} from 'class-validator';
import { UserRole } from 'src/auth/schema/user.schema';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsMongoId()
  clientId?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
