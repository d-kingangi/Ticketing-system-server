import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { Ticket, TicketSchema } from './entities/ticket.entity';
import { TicketRepository } from './ticket.repository';
import { EventModule } from '../event/event.module';
import { TicketTypeModule } from '../ticket-type/ticket-type.module';
// import { UserModule } from '../users/users.module';
import { PurchaseModule } from '../purchase/purchase.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Ticket.name, schema: TicketSchema }]),

    // Import other modules whose services are dependencies of TicketService.
    // This makes services like EventService, TicketTypeService, etc., available for injection.
    EventModule,
    TicketTypeModule,
    UsersModule,

    // Use forwardRef() to resolve circular dependencies.
    // TicketService needs PurchaseService, and PurchaseService will eventually need TicketService
    // to generate/invalidate tickets after a purchase is completed or refunded.
    forwardRef(() => PurchaseModule),
  ],
  controllers: [TicketController],
  providers: [
    TicketService,
    TicketRepository, // Provide the TicketRepository for use within the module.
  ],
  // Export TicketService and TicketRepository so they can be imported and used by other modules,
  // such as PurchaseModule and the upcoming ReportsModule.
  exports: [TicketService, TicketRepository],
})
export class TicketModule {}
