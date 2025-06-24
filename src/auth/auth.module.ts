import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtAuthModule } from './jwt.module';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { ClientAccessGuard } from './guards/client-access.guard';
import { OwnershipGuard } from './guards/ownership.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User, UserSchema } from './schema/user.schema';
import { EmailModule } from 'src/emails/emails.module';

@Module({
  imports: [
    PassportModule,
    JwtAuthModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RolesGuard,
    ClientAccessGuard,
    OwnershipGuard,
  ],
  exports: [AuthService],
})
export class AuthModule {}
