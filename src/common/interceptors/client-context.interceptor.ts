import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class ClientContextInterceptor implements NestInterceptor {
  constructor(private readonly jwtService: JwtService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = this.jwtService.verify(token);

        // Add client context to request
        request.clientId = decoded.clientId;

        // Also add user info for convenience
        request.userId = decoded.sub;
        request.userRole = decoded.role;
      } catch (error) {
        throw new UnauthorizedException('Invalid token');
      }
    }

    return next.handle();
  }
}
