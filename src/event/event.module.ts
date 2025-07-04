import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { Event, EventSchema } from './entities/event.entity';
import { EventRepository } from './event.repository';
import { OrganizationModule } from 'src/organization/organization.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]),
    OrganizationModule,
  ],
  controllers: [EventController],
  providers: [EventService, EventRepository], // Add EventRepository to providers
  exports: [EventService, EventRepository],
})
export class EventModule { }
