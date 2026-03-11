import { Module } from '@nestjs/common';
import { ImagesModule } from './images/images.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [ImagesModule, PrismaModule],
})
export class AppModule {}
