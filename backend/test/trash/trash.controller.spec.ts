import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { TrashController } from 'src/trash/trash.controller';
import { TrashService } from 'src/trash/trash.service';

describe('TrashController', () => {
  let controller: TrashController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrashController],
      providers: [
        {
          provide: TrashService,
          useValue: {
            findAll: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TrashController>(TrashController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
