import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService) {}

  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV');
  }

  get port(): number {
    return this.configService.get<number>('PORT');
  }

  get mongoUri(): string {
    return this.configService.get<string>('MONGODB_URI');
  }

  get jwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET');
  }

  get jwtExpire(): string {
    return this.configService.get<string>('JWT_EXPIRE');
  }
}
