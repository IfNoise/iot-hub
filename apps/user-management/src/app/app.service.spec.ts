import { Test } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = app.get<AppService>(AppService);
  });

  describe('getServiceInfo', () => {
    it('should return service information', () => {
      const result = service.getServiceInfo();
      expect(result).toEqual({
        service: 'User Management Service',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          users: '/users',
          health: '/health',
          docs: '/api',
        },
      });
    });
  });
});
