import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import { json, urlencoded, static as expressStatic } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allow CORS for local development
  app.enableCors();

  // Increase JSON body limit for large payloads
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Serve uploaded images statically at /static
  app.use('/static', expressStatic(join(process.cwd(), 'data', 'uploads')));

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`\n🚀 Image Memory API running at http://localhost:${port}`);
  console.log(`   POST /images/upload         — ingest an image`);
  console.log(`   GET  /images                — list all images`);
  console.log(`   GET  /images/people/all     — list all identified people`);
  console.log(`   GET  /images/relationships/all — all relationships`);
  console.log(`   POST /backend/query         — query memory in natural language`);
}
bootstrap();
