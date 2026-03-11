import { Module } from '@nestjs/common';
import { ImagesController, BackendController } from './images.controller';
import { ImagesService } from './images.service';
import { ImagePipeline } from './image.pipeline';
import { VlmService } from './vlm.service';
import { PersonService } from './person.service';
import { ImageMemoryStore } from './image-memory.store';

@Module({
  controllers: [ImagesController, BackendController],
  providers: [
    ImagesService,
    ImagePipeline,
    VlmService,
    PersonService,
    ImageMemoryStore,
  ],
  exports: [ImagesService, ImageMemoryStore],
})
export class ImagesModule {}
