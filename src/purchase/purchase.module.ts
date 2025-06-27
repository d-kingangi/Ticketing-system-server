// purchase.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PurchaseService } from './purchase.service';
import { PurchaseController } from './purchase.controller';
import { Purchase, PurchaseSchema } from './entities/purchase.entity';
import { PurchaseRepository } from './purchase.repository';
import { EventModule } from '../event/event.module';
import { TicketTypeModule } from '../ticket-type/ticket-type.module';
import { UsersModule } from '../users/users.module';
import { DiscountModule } from '../discount/discount.module'; // CHANGE: Import the new DiscountModule
import { TicketModule } from 'src/ticket/ticket.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Purchase.name, schema: PurchaseSchema }]),
    EventModule,
    TicketTypeModule,
    UsersModule,
    DiscountModule, // CHANGE: Add DiscountModule to the imports array
    forwardRef(() => TicketModule),
  ],
  controllers: [PurchaseController],
  providers: [PurchaseService, PurchaseRepository],
  exports: [PurchaseService, PurchaseRepository],
})
export class PurchaseModule {}
