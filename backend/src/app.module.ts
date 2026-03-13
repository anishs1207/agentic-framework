import { Module } from '@nestjs/common';
import { ImagesModule } from './images/images.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [ImagesModule, PrismaModule, UserModule],
})
export class AppModule {}
