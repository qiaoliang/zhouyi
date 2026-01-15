import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { DivinationService } from './divination.service';
import { Hexagram } from '../../database/schemas/hexagram.schema';
import { DivinationRecord } from '../../database/schemas/divination-record.schema';
import { GuestDivination } from '../../database/schemas/guest-divination.schema';
import { Model } from 'mongoose';
import { YinYang } from '../../database/schemas/divination-record.schema';

describe('DivinationService', () => {
  let service: DivinationService;
  let hexagramModel: Model<Hexagram>;
  let divinationRecordModel: Model<DivinationRecord>;

  // Mock hexagram data
  const mockHexagram = {
    _id: '507f1f77bcf86cd799439011',
    sequence: 1,
    name: '乾为天',
    symbol: '䷀',
    pinyin: 'qián wéi tiān',
    guaci: {
      original: '元，亨，利，贞。',
      translation: '元始，亨通，和谐有利，正固持久。',
    },
    tuanci: {
      original: '大哉乾元，万物资始，乃统天。',
      translation: '伟大的乾元，万物赖此而始，乃统领天道。',
    },
    xiangci: {
      original: '天行健，君子以自强不息。',
      translation: '天道运行刚劲强健，君子应效法天道，自强不息。',
    },
    yaoci: [
      {
        position: 1,
        name: '初九',
        yinYang: 'yang',
        original: '潜龙，勿用。',
        translation: '龙潜伏在深渊，暂时不宜有所作为。',
        xiang: '潜龙勿用，阳在下也。',
      },
      {
        position: 2,
        name: '九二',
        yinYang: 'yang',
        original: '见龙在田，利见大人。',
        translation: '龙出现在田野上，有利于拜见大人。',
        xiang: '见龙在田，德施普也。',
      },
      {
        position: 3,
        name: '九三',
        yinYang: 'yang',
        original: '君子终日乾乾，夕惕若，厉，无咎。',
        translation: '君子整日勤奋努力，夜晚警惕小心，虽有危险，但没有灾祸。',
        xiang: '终日乾乾，反复道也。',
      },
      {
        position: 4,
        name: '九四',
        yinYang: 'yang',
        original: '或跃在渊，无咎。',
        translation: '或者跃进深渊，没有灾祸。',
        xiang: '或跃在渊，进无咎也。',
      },
      {
        position: 5,
        name: '九五',
        yinYang: 'yang',
        original: '飞龙在天，利见大人。',
        translation: '龙飞在天上，有利于拜见大人。',
        xiang: '飞龙在天，大人造也。',
      },
      {
        position: 6,
        name: '上九',
        yinYang: 'yang',
        original: '亢龙有悔。',
        translation: '龙飞得太高会有悔恨。',
        xiang: '亢龙有悔，盈不可久也。',
      },
    ],
    metadata: {
      trigrams: {
        upper: { name: '乾', symbol: '☰', nature: '天', position: 'upper' },
        lower: { name: '乾', symbol: '☰', nature: '天', position: 'lower' },
      },
    },
  };

  const mockDivinationRecord = {
    _id: '507f1f77bcf86cd799439012',
    userId: 'user123',
    hexagram: {
      primary: {
        name: '乾为天',
        symbol: '䷀',
        pinyin: 'qián wéi tiān',
        sequence: 1,
      },
      lines: [
        { position: 1, yinYang: YinYang.YANG, changing: false },
        { position: 2, yinYang: YinYang.YANG, changing: false },
        { position: 3, yinYang: YinYang.YANG, changing: false },
        { position: 4, yinYang: YinYang.YANG, changing: false },
        { position: 5, yinYang: YinYang.YANG, changing: false },
        { position: 6, yinYang: YinYang.YANG, changing: false },
      ],
      changed: {
        name: '乾为天',
        symbol: '䷀',
        pinyin: 'qián wéi tiān',
        sequence: 1,
      },
      mutual: {
        name: '乾为天',
        symbol: '䷀',
        pinyin: 'qián wéi tiān',
        sequence: 1,
      },
      changingLines: [],
    },
    interpretation: {
      basic: {
        hexagramName: '乾为天',
        guaci: '元，亨，利，贞。',
        guaciTranslation: '元始，亨通，和谐有利，正固持久。',
        yaoci: [],
      },
    },
    payment: {
      type: 'free',
      amount: 0,
      status: 'unpaid',
    },
    createdAt: new Date(),
    save: jest.fn().mockResolvedValue(true),
  };

  const mockExec = jest.fn();
  const mockHexFindOneExec = jest.fn();
  const mockSortSkipLimit = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: mockExec,
  };
  const mockFindOneExec = jest.fn();

  const mockHexagramModel = {
    findOne: jest.fn().mockReturnValue({ exec: mockHexFindOneExec }),
    find: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockDivinationRecordModel = function(data: any) {
    return {
      ...data,
      _id: '507f1f77bcf86cd799439012',
      save: jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439012',
        ...data,
      }),
    };
  } as any;

  mockDivinationRecordModel.find = jest.fn().mockReturnValue(mockSortSkipLimit);
  mockDivinationRecordModel.countDocuments = jest.fn();
  mockDivinationRecordModel.findOne = jest.fn().mockReturnValue({ exec: mockFindOneExec });

  const mockGuestDivinationModel = function(data: any) {
    return {
      ...data,
      _id: '507f1f77bcf86cd799439013',
      save: jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439013',
        ...data,
      }),
    };
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DivinationService,
        {
          provide: getModelToken('Hexagram'),
          useValue: mockHexagramModel,
        },
        {
          provide: getModelToken('DivinationRecord'),
          useValue: mockDivinationRecordModel,
        },
        {
          provide: getModelToken(GuestDivination.name),
          useValue: mockGuestDivinationModel,
        },
      ],
    }).compile();

    service = module.get<DivinationService>(DivinationService);
    hexagramModel = module.get<Model<Hexagram>>(getModelToken('Hexagram'));
    divinationRecordModel = module.get<Model<DivinationRecord>>(
      getModelToken('DivinationRecord'),
    );

    // Reset mocks before each test
    jest.clearAllMocks();

    // Reset mock implementations
    mockExec.mockResolvedValue([]);
    mockHexFindOneExec.mockResolvedValue(mockHexagram);
    mockFindOneExec.mockResolvedValue(mockDivinationRecord);
    mockDivinationRecordModel.countDocuments.mockResolvedValue(0);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('performDivination', () => {
    it('should perform divination and return hexagram', async () => {
      mockHexFindOneExec.mockResolvedValue(mockHexagram);

      const result = await service.performDivination();

      expect(result).toBeDefined();
      expect(result.primary).toBeDefined();
      expect(result.primary.name).toBeDefined();
      expect(result.lines).toHaveLength(6);
      expect(result.lines[0].position).toBe(1);
      expect(result.lines[5].position).toBe(6);
    });

    it('should handle changing lines', async () => {
      mockHexFindOneExec.mockResolvedValue(mockHexagram);

      const result = await service.performDivination();

      expect(result.changingLines).toBeDefined();
      expect(Array.isArray(result.changingLines)).toBe(true);
    });

    it('should calculate mutual hexagram', async () => {
      mockHexFindOneExec.mockResolvedValue(mockHexagram);

      const result = await service.performDivination();

      expect(result.mutual).toBeDefined();
      expect(result.mutual.name).toBeDefined();
    });

    it('should throw BadRequestException when hexagram not found', async () => {
      mockHexFindOneExec.mockResolvedValue(null);
      mockHexagramModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      await expect(service.performDivination()).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('saveDivinationRecord', () => {
    it('should save divination record with user ID', async () => {
      const hexagram = {
        primary: { name: '乾', symbol: '䷀', pinyin: 'qián', sequence: 1 },
        lines: [],
        changed: { name: '乾', symbol: '䷀', pinyin: 'qián', sequence: 1 },
        mutual: { name: '乾', symbol: '䷀', pinyin: 'qián', sequence: 1 },
        changingLines: [],
      };

      mockHexFindOneExec.mockResolvedValue(mockHexagram);

      const mockConstructor = jest.fn().mockReturnValue({
        ...mockDivinationRecord,
        save: jest.fn().mockResolvedValue(mockDivinationRecord),
      });

      (mockDivinationRecordModel as any).constructor = mockConstructor;
      Object.assign(mockDivinationRecordModel, {
        constructor: mockConstructor,
      });

      const result = await service.saveDivinationRecord(
        hexagram,
        'user123',
        undefined,
        { platform: 'ios', model: 'iPhone 14' },
      );

      expect(mockHexagramModel.findOne).toHaveBeenCalledWith({
        sequence: 1,
      });
    });

    it('should save divination record with guest ID', async () => {
      const hexagram = {
        primary: { name: '乾', symbol: '䷀', pinyin: 'qián', sequence: 1 },
        lines: [],
        changed: { name: '乾', symbol: '䷀', pinyin: 'qián', sequence: 1 },
        mutual: { name: '乾', symbol: '䷀', pinyin: 'qián', sequence: 1 },
        changingLines: [],
      };

      mockHexFindOneExec.mockResolvedValue(mockHexagram);

      const mockConstructor = jest.fn().mockReturnValue({
        ...mockDivinationRecord,
        userId: undefined,
        guestId: 'guest123',
        save: jest.fn().mockResolvedValue(mockDivinationRecord),
      });

      (mockDivinationRecordModel as any).constructor = mockConstructor;
      Object.assign(mockDivinationRecordModel, {
        constructor: mockConstructor,
      });

      const result = await service.saveDivinationRecord(
        hexagram,
        undefined,
        'guest123',
        { platform: 'android' },
      );

      expect(mockHexagramModel.findOne).toHaveBeenCalledWith({
        sequence: 1,
      });
    });
  });

  describe('getUserDivinationHistory', () => {
    it('should return user divination history', async () => {
      const mockRecords = [mockDivinationRecord];
      const mockCount = 1;

      mockExec.mockResolvedValue(mockRecords);
      mockDivinationRecordModel.countDocuments.mockResolvedValue(mockCount);

      const result = await service.getUserDivinationHistory('user123', 1, 20);

      expect(result.records).toEqual(mockRecords);
      expect(result.total).toBe(mockCount);
      expect(mockDivinationRecordModel.find).toHaveBeenCalledWith({
        userId: 'user123',
      });
    });
  });

  describe('getGuestDivinationHistory', () => {
    it('should return guest divination history', async () => {
      const mockRecords = [mockDivinationRecord];
      const mockCount = 1;

      mockExec.mockResolvedValue(mockRecords);
      mockDivinationRecordModel.countDocuments.mockResolvedValue(mockCount);

      const result = await service.getGuestDivinationHistory('guest123', 1, 20);

      expect(result.records).toEqual(mockRecords);
      expect(result.total).toBe(mockCount);
      expect(mockDivinationRecordModel.find).toHaveBeenCalledWith({
        guestId: 'guest123',
      });
    });
  });

  describe('getDivinationRecord', () => {
    it('should return divination record by ID', async () => {
      mockFindOneExec.mockResolvedValue(mockDivinationRecord);

      const result = await service.getDivinationRecord('record123', 'user123');

      expect(result).toEqual(mockDivinationRecord);
      expect(mockDivinationRecordModel.findOne).toHaveBeenCalledWith({
        _id: 'record123',
        userId: 'user123',
      });
    });

    it('should return null if record not found', async () => {
      mockFindOneExec.mockResolvedValue(null);

      const result = await service.getDivinationRecord('invalid-id', 'user123');

      expect(result).toBeNull();
    });
  });
});
