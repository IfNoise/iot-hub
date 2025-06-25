import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();
  });

  describe('getData', () => {
    it('should return TS-REST handler function', () => {
      const appController = app.get<AppController>(AppController);
      const result = appController.getData();
      expect(typeof result).toBe('function');
    });
  });
});
