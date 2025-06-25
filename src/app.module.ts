import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthModule } from './auth/jwt.module';
import { APP_GUARD } from '@nestjs/core';
import { ClientContextMiddleware } from './common/middlewares/client-context.middleware';
import { JwtClientGuard } from './auth/guards/jwt-client.guard';
import { UsersModule } from './users/users.module';
import { EmailModule } from './emails/emails.module';
import { TicketModule } from './ticket/ticket.module';
import { TicketTypeModule } from './ticket-type/ticket-type.module';
import { EventModule } from './event/event.module';
import { OrganizationModule } from './organization/organization.module';
import { PurchaseModule } from './purchase/purchase.module';
import { ReportModule } from './report/report.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    JwtAuthModule, // Import JWT module first
    AuthModule,
    UsersModule,
    EmailModule,
    TicketModule,
    TicketTypeModule,
    EventModule,
    OrganizationModule,
    PurchaseModule,
    ReportModule, // Ensure InsurancesModule is imported
  ],
  providers: [
    // Register JwtClientGuard as a global guard
    {
      provide: APP_GUARD,
      useClass: JwtClientGuard,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply simplified client context middleware that doesn't have dependencies
    consumer
      .apply(ClientContextMiddleware)
      .exclude(
        { path: 'api/auth/login', method: RequestMethod.POST },
        { path: 'api/auth/register', method: RequestMethod.POST },
        { path: 'api/register-client', method: RequestMethod.POST },
      )
      .forRoutes('*');
  }
}
