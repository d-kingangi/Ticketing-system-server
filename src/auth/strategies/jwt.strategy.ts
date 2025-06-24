import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // The JWT payload now contains 'roles' (an array) instead of 'role' (a string).
    // Ensure the payload is correctly mapped to the user object.
    return {
      userId: payload.sub,
      email: payload.email,
      roles: payload.roles, // Changed from 'role' to 'roles' (array)
    };
  }
}
