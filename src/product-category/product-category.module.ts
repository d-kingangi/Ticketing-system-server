import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductCategoryService } from './product-category.service';
import { ProductCategoryController } from './product-category.controller';
import {
  ProductCategory,
  ProductCategorySchema,
} from './entities/product-category.entity';
import { ProductCategoryRepository } from './product-category.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductCategory.name, schema: ProductCategorySchema },
    ]),
  ],
  controllers: [ProductCategoryController],
  providers: [ProductCategoryService, ProductCategoryRepository],
  exports: [ProductCategoryService],
})
export class ProductCategoryModule { }
