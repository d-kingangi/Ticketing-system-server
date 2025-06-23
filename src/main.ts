import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Strips away properties not defined in the DTO
    forbidNonWhitelisted: true, // Throws an error if non-whitelisted properties are present
    transform: true, // Automatically transforms payloads to DTO instances
    transformOptions: {
      enableImplicitConversion: true, // Allows conversion of path/query params to expected types
    },
  }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
