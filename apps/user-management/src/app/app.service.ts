import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getServiceInfo() {
    return {
      service: 'User Management Service',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        users: '/users',
        health: '/health',
        docs: '/api',
      },
    };
  }
}
