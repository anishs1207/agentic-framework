import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);
  private readonly cropsDir = path.join(process.cwd(), 'data', 'crops');

  constructor() {
    if (!fs.existsSync(this.cropsDir)) {
      fs.mkdirSync(this.cropsDir, { recursive: true });
    }
  }

  /**
   * Crop an image based on normalized bounding box [ymin, xmin, ymax, xmax] (0-1000)
   * Returns the filename of the saved crop.
   */
  async cropPerson(
    sourcePath: string,
    personId: string,
    box: [number, number, number, number],
  ): Promise<string | null> {
    try {
      const metadata = await sharp(sourcePath).metadata();
      if (!metadata.width || !metadata.height) return null;

      const [ymin, xmin, ymax, xmax] = box;
      
      const left = Math.round((xmin / 1000) * metadata.width);
      const top = Math.round((ymin / 1000) * metadata.height);
      const width = Math.round(((xmax - xmin) / 1000) * metadata.width);
      const height = Math.round(((ymax - ymin) / 1000) * metadata.height);

      // Ensure dimensions are positive
      if (width <= 0 || height <= 0) return null;

      const cropFilename = `${personId}.jpg`;
      const outputPath = path.join(this.cropsDir, cropFilename);

      await sharp(sourcePath)
        .extract({ left, top, width, height })
        .resize(300, 300, { fit: 'cover' }) // Standardized size for profile pics
        .toFile(outputPath);

      return cropFilename;
    } catch (err) {
      this.logger.error(`Failed to crop image for person ${personId}: ${err.message}`);
      return null;
    }
  }
}
