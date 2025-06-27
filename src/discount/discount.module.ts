import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Discount, DiscountSchema } from './entities/discount.entity';
import { DiscountService } from './discount.service';
import { DiscountRepository } from './discount.repository';
import { DiscountController } from './discount.controller';
import { EventModule } from '../event/event.module'; // Import EventModule
import { OrganizationModule } from '../organization/organization.module'; // Import OrganizationModule
import { TicketTypeModule } from '../ticket-type/ticket-type.module'; // Import TicketTypeModule

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Discount.name, schema: DiscountSchema }]),
    EventModule,
    OrganizationModule,
    TicketTypeModule,
  ],
  controllers: [DiscountController],
  providers: [DiscountService, DiscountRepository],
  exports: [DiscountService],
})
export class DiscountModule {}
