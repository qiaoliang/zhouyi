import { Test, TestingModule } from '@nestjs/testing';
import { DivinationController } from './divination.controller';
import { DivinationService } from './divination.service';
import { HexagramAnalysisService } from './hexagram-analysis.service';
import { InterpretationService } from './interpretation.service';
import { GLMService } from './glm.service';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../membership/guards/subscription.guard';
import { getModelToken } from '@nestjs/mongoose';
import { GuestDivination } from '../../database/schemas/guest-divination.schema';

describe('DivinationController', () => {
  let controller: DivinationController;
  let divinationService: any;

  const mockGuestDivinationModel = {
    save: jest.fn().mockResolvedValue({ _id: 'test-record-id', createdAt: new Date() }),
  };

  const mockHexagramModel = {
    findOne: jest.fn().mockResolvedValue(null),
  };

  beforeEach(async () => {
    const mockHexagram = {
      name: '乾为天',
      guaci: {
        original: '元亨利贞。',
        translation: '元始、亨通、和谐、贞正。',
        annotation: ''
      },
      tuanci: {
        original: '彖曰：大哉乾元，万物资始，乃统天。',
        translation: '彖传曰：乾卦的元始之道伟大啊，万物都由此开始，统领天道。',
      },
      xiangci: {
        original: '象曰：天行健，君子以自强不息。',
        translation: '象传曰：天道运行刚健有力，君子应该效法天道，自强不息。',
      },
      yaoci: [
        {
          position: 1,
          name: '初九',
          yinYang: 'yang',
          original: '潜龙勿用。',
          translation: '潜藏的龙，不宜有所作为。',
          xiang: '象曰：潜龙勿用，阳在下也。'
        },
        {
          position: 2,
          name: '九二',
          yinYang: 'yang',
          original: '见龙在田，利见大人。',
          translation: '龙出现在田野，有利于拜见大人。',
          xiang: '象曰：见龙在田，德施普也。'
        }
      ],
      metadata: {
        element: '金',
        nature: '刚健',
        direction: '西北',
        season: '秋',
        trigrams: {
          upper: { name: '乾', symbol: '☰', nature: '刚健', position: 'upper' },
          lower: { name: '乾', symbol: '☰', nature: '刚健', position: 'lower' }
        },
        family: '父',
        body: '首',
        animal: '马',
        color: '白',
        category: {
          nature: 'yang',
          quality: 'lucky',
          difficulty: 'simple'
        }
      },
      category: {
        nature: 'yang',
        quality: 'lucky',
        difficulty: 'simple'
      },
      tags: ['乾', '天', '刚健']
    };

    const mockDivinationService = {
      performDivination: jest.fn().mockResolvedValue({
        primary: { name: '乾为天', symbol: '䷀', pinyin: 'qián wéi tiān', sequence: 1 },
        lines: [],
        changed: { name: '乾为天', symbol: '䷀', pinyin: 'qián wéi tiān', sequence: 1 },
        mutual: { name: '乾为天', symbol: '䷀', pinyin: 'qián wéi tiān', sequence: 1 },
        changingLines: [],
      }),
      saveGuestDivinationRecord: jest.fn().mockResolvedValue({
        _id: 'test-record-id',
        createdAt: new Date(),
      }),
      hexagramModel: mockHexagramModel,
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DivinationController],
      providers: [
        {
          provide: DivinationService,
          useValue: mockDivinationService,
        },
        {
          provide: HexagramAnalysisService,
          useValue: {
            generateDetailedAnalysis: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: InterpretationService,
          useValue: {
            generateBasicInterpretation: jest.fn().mockResolvedValue({
              overall: '测试概述',
              career: '测试事业',
              relationships: '测试感情',
              health: '测试健康',
              wealth: '测试财运',
            }),
          },
        },
        {
          provide: GLMService,
          useValue: {
            generateAIInterpretation: jest.fn().mockResolvedValue({
              summary: '测试摘要',
              detailedAnalysis: '测试分析',
              advice: '测试建议',
              createdAt: new Date(),
              cached: false,
            }),
          },
        },
        {
          provide: getModelToken(GuestDivination.name),
          useValue: mockGuestDivinationModel,
        },
      ],
    })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(SubscriptionGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<DivinationController>(DivinationController);
    divinationService = module.get(DivinationService);

    // 设置 mockHexagramModel.findOne 返回值
    mockHexagramModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockHexagram),
    });
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('guestDivinate', () => {
    it('should return hexagram and interpretation for guest user', async () => {
      const dto = {
        device: {
          platform: 'mini',
          deviceId: 'test-device-123',
        },
      };

      const result = await controller.guestDivinate(
        dto,
        { ip: '127.0.0.1' } as any,
      );

      expect(result.success).toBe(true);
      expect(result.data.hexagram).toBeDefined();
      expect(result.data.interpretation).toBeDefined();
      expect(result.data.interpretation.overall).toBeDefined();
      expect(result.data.interpretation.career).toBeDefined();
      expect(result.data.interpretation.relationships).toBeDefined();
      expect(result.data.interpretation.health).toBeDefined();
      expect(result.data.interpretation.wealth).toBeDefined();
      expect(result.data.loginPrompt).toBeDefined();
      expect(result.data.loginPrompt.features).toHaveLength(3);
    });

    it('should save guest divination record', async () => {
      const dto = {
        device: {
          platform: 'mini',
          deviceId: 'test-device-456',
        },
      };

      const result = await controller.guestDivinate(
        dto,
        { ip: '127.0.0.1' } as any,
      );

      expect(result.data.recordId).toBeDefined();
      expect(divinationService.saveGuestDivinationRecord).toHaveBeenCalledWith(
        expect.any(Object),
        'test-device-456',
        dto.device,
        '127.0.0.1',
      );
    });
  });

  describe('POST /record/:id/ai-interpretation', () => {
    let glmService: any;

    beforeEach(() => {
      glmService = controller['glmService'];
    });

    it('should return AI interpretation for authenticated user', async () => {
      const mockUser = { userId: 'user-123' };
      const mockAIInterpretation = {
        summary: '测试摘要',
        detailedAnalysis: '测试分析',
        advice: '测试建议',
        createdAt: new Date(),
        cached: false,
      };

      jest.spyOn(glmService, 'generateAIInterpretation')
        .mockResolvedValue(mockAIInterpretation);

      const response = await controller.getAIInterpretation('record-123', mockUser, {});

      expect(response.success).toBe(true);
      expect(response.data.aiInterpretation).toBeDefined();
      expect(response.message).toBe('获取 AI 解卦成功');
    });
  });
});