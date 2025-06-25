import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { EventModule } from 'src/event/event.module';
import { Purchase, PurchaseSchema } from 'src/purchase/entities/purchase.entity';
import { PurchaseModule } from 'src/purchase/purchase.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Purchase.name, schema: PurchaseSchema },
    ]),
    PurchaseModule,
    EventModule,
  ],
  controllers: [ReportController],
  providers: [ReportService],

})
export class ReportModule {}
