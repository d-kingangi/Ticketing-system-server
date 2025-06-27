import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TicketTypeService } from './ticket-type.service';
import { TicketTypeController } from './ticket-type.controller';
import { TicketType, TicketTypeSchema } from './entities/ticket-type.entity';
import { TicketTypeRepository } from './ticket-type.repository';
import { EventModule } from '../event/event.module'; // CHANGE: Import EventModule
import { OrganizationModule } from '../organization/organization.module'; // CHANGE: Import OrganizationModule

@Module({
  imports: [
    MongooseModule.forFeature([{ name: TicketType.name, schema: TicketTypeSchema }]),
    EventModule,
    OrganizationModule,
  ],
  controllers: [TicketTypeController],
  providers: [TicketTypeService, TicketTypeRepository],
  exports: [TicketTypeService, TicketTypeRepository],
})
export class TicketTypeModule {}
