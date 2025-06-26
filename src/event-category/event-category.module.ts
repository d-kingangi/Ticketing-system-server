import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose'; // Import MongooseModule
import { EventCategoryService } from './event-category.service';
import { EventCategoryController } from './event-category.controller';
import { EventCategory, EventCategorySchema } from './entities/event-category.entity'; // Import the entity and schema
import { EventCategoryRepository } from './event-category.repository'; // Import the repository

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EventCategory.name, schema: EventCategorySchema },
    ]),
  ],
  controllers: [EventCategoryController],
  providers: [EventCategoryService, EventCategoryRepository],
  exports: [EventCategoryService],
})
export class EventCategoryModule {}
