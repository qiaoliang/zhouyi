import { Test, TestingModule } from '@nestjs/testing';
import { InterpretationService } from './interpretation.service';
import { getModelToken } from '@nestjs/mongoose';
import { Hexagram } from '../../database/schemas/hexagram.schema';

describe('InterpretationService', () => {
  let service: InterpretationService;

  const mockHexagramModel = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterpretationService,
        {
          provide: getModelToken('Hexagram'),
          useValue: mockHexagramModel,
        },
      ],
    }).compile();

    service = module.get<InterpretationService>(InterpretationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateBasicInterpretation', () => {
    it('should generate interpretation for a hexagram', async () => {
      const hexagram = {
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
        tags: ['乾', '天', '刚健']
      } as any;

      const result = await service.generateBasicInterpretation(hexagram);

      expect(result).toBeDefined();
      expect(result.overall).toContain('元始');
      expect(result.career).toBeDefined();
      expect(result.relationships).toBeDefined();
      expect(result.health).toBeDefined();
      expect(result.wealth).toBeDefined();
    });
  });
});