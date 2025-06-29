import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthModule } from './auth/jwt.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtClientGuard } from './auth/guards/jwt-client.guard';
import { UsersModule } from './users/users.module';
import { EmailModule } from './emails/emails.module';
import { TicketModule } from './ticket/ticket.module';
import { TicketTypeModule } from './ticket-type/ticket-type.module';
import { EventModule } from './event/event.module';
import { OrganizationModule } from './organization/organization.module';
import { PurchaseModule } from './purchase/purchase.module';
import { ReportModule } from './report/report.module';
import { EventCategoryModule } from './event-category/event-category.module';
import { DiscountModule } from './discount/discount.module';
import { CustomerModule } from './customer/customer.module';
import { ProductModule } from './product/product.module';
import { ProductCategoryModule } from './product-category/product-category.module';

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
    ReportModule,
    EventCategoryModule,
    DiscountModule,
    CustomerModule,
    ProductModule,
    ProductCategoryModule, 
  ],
  providers: [
    // Register JwtClientGuard as a global guard
    // This guard's purpose was to extract client/organization ID from the token
    // and attach it to the request. However, with the recent changes:
    // 1. JwtAuthGuard (from @nestjs/passport) is now responsible for authenticating the user
    //    and populating `request.user` with the full UserDocument (which includes organizationId).
    // 2. The @GetOrganizationId() decorator directly accesses `request.user.organizationId`.
    // 3. The JwtClientGuard's `canActivate` method always returns `true`, meaning it doesn't
    //    actually enforce authentication or block requests; it only attempts to extract context.
    // Therefore, this global guard is redundant and can be removed.
    // Authentication and organization-specific access are now handled by JwtAuthGuard and
    // OrganizationAccessGuard (applied at the controller/method level) and the decorators.
    // {
    //   provide: APP_GUARD,
    //   useClass: JwtClientGuard,
    // },
  ],
})
export class AppModule {
  // The configure method is used to apply middleware.
  // Currently, consumer.apply() is called without any middleware arguments,
  // meaning no middleware is actually being applied.
  // The .exclude() method is then called on this empty middleware chain,
  // which also has no practical effect.
  // The path 'api/register-client' might also be outdated if organization creation
  // is now handled via the OrganizationController.
  // If no custom global middleware is intended, this method can be safely removed.
  // If you plan to add global middleware later, ensure it's properly defined.
  // For now, we'll remove it for clarity.
  // configure(consumer: MiddlewareConsumer) {
  //   consumer
  //     .apply()
  //     .exclude(
  //       { path: 'api/auth/login', method: RequestMethod.POST },
  //       { path: 'api/auth/register', method: RequestMethod.POST },
  //       { path: 'api/register-client', method: RequestMethod.POST },
  //     )
  //     .forRoutes('*');
  // }

}
