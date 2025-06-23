import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { ClientsModule } from './clients/clients.module';
import { PatientsModule } from './patients/patients.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthModule } from './auth/jwt.module';
import { APP_GUARD } from '@nestjs/core';
import { ClientContextMiddleware } from './common/middlewares/client-context.middleware';
import { JwtClientGuard } from './auth/guards/jwt-client.guard';
import { UsersModule } from './users/users.module';
import { EmailModule } from './emails/emails.module';
import { ReservationModule } from './reservation/reservation.module';
import { QueuesModule } from './queues/queues.module';
import { PersonnelModule } from './personnel/personnel.module';
import { DepartmentsModule } from './departments/departments.module';
import { ServicesModule } from './services/services.module';
import { ChargesModule } from './charges/charges.module';
import { InsuranceModule } from './insuarances/insurance.module';
import { VisitTypeModule } from './visit-type/visit-type.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    JwtAuthModule, // Import JWT module first
    AuthModule,
    ClientsModule,
    PatientsModule,
    UsersModule,
    EmailModule,
    ReservationModule,
    QueuesModule,
    PersonnelModule,
    DepartmentsModule,
    ServicesModule,
    ChargesModule,
    InsuranceModule,
    VisitTypeModule, // Ensure InsurancesModule is imported
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
