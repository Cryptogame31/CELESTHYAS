import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global API prefix
  app.setGlobalPrefix('api/v1');

  // Enable validation pipe globally for body validation using DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip out properties not defined in DTOs
      transform: true, // auto-transform payloads to match DTO types
      forbidNonWhitelisted: true, // throw error if non-whitelisted properties are sent
    }),
  );

  // Enable Cross-Origin Resource Sharing (CORS) for client applications (e.g., Flutter web/desktop/mobile)
  app.enableCors();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`\n🚀 Antigravity Mystic Premium (Vidente) running on: http://localhost:${port}/api/v1\n`);
}
bootstrap();
