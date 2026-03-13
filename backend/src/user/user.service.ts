import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
  getHelloWorld() {
    return { message: 'Hello from User Service' };
  }
}
