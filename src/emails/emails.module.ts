import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailsController } from './emails.controller';
import { EmailsService } from './emails.service';
import { ClientsModule } from 'src/clients/clients.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => ClientsModule), // Use forwardRef to avoid circular dependency
  ],
  providers: [EmailsService],
  controllers: [EmailsController],
  exports: [EmailsService],
})
export class EmailModule {}
