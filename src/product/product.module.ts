import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { Product, ProductSchema } from './entities/product.entity';
import { ProductRepository } from './product.repository';
import { ProductCategoryModule } from 'src/product-category/product-category.module'; // <-- Add this import

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    ProductCategoryModule
  ],
  controllers: [ProductController],
  providers: [ProductService, ProductRepository],
  exports: [ProductService, ProductRepository],
})
export class ProductModule {}
