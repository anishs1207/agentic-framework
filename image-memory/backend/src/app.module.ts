import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ImagesModule } from './images/images.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ImagesModule, 
    PrismaModule, 
    UserModule
  ],
})
export class AppModule {}
