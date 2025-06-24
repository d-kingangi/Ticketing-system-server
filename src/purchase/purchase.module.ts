import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose'; // Import MongooseModule
import { PurchaseService } from './purchase.service';
import { PurchaseController } from './purchase.controller';
import { Purchase, PurchaseSchema } from './entities/purchase.entity'; // Import Purchase entity and schema
import { PurchaseRepository } from './purchase.repository'; // Import PurchaseRepository
import { EventModule } from '../event/event.module'; // Import EventModule as PurchaseService depends on EventService
import { TicketTypeModule } from 'src/ticket-type/ticket-type.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Purchase.name, schema: PurchaseSchema }]),
    EventModule,
    TicketTypeModule,
    UserModule,
  ],
  controllers: [PurchaseController],
  providers: [
    PurchaseService,
    PurchaseRepository, // Provide the PurchaseRepository
  ],
  exports: [PurchaseService, PurchaseRepository], // Export for other modules that might need them
})
export class PurchaseModule {}
