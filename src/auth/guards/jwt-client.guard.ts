import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';

@Injectable()
export class JwtClientGuard implements CanActivate {
  private readonly logger = new Logger(JwtClientGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.token || this.extractTokenFromHeader(request);

    if (!token) {
      return true; // Continue without client context
    }

    try {
      const decoded = this.jwtService.verify(token);

      // Add client context to request if available in token
      if (decoded.clientId) {
        request.clientId = decoded.clientId;
        request.userId = decoded.sub;
        request.userRole = decoded.role;
      }

      return true;
    } catch (error) {
      this.logger.warn(`Invalid token: ${error.message}`);
      return true; // Continue without client context
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
