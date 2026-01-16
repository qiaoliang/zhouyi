import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LearningService } from './learning.service';
import { Course } from '../../database/schemas/course.schema';
import { LearningProgress } from '../../database/schemas/learning-progress.schema';
import { Model } from 'mongoose';

describe('LearningService', () => {
  let service: LearningService;
  let courseModel: Model<Course>;
  let progressModel: Model<LearningProgress>;

  // Mock course data
  const mockCourse1 = {
    _id: '507f1f77bcf86cd799439011',
    courseDataId: 'course-001',
    title: '周易基础入门',
    description: '学习周易的基本概念和历史',
    order: 1,
    duration: 30,
    difficulty: 'beginner',
    tags: ['基础', '入门'],
    content: {
      sections: [
        {
          title: '什么是周易',
          content: '周易是中国古代最重要的经典之一...',
        },
      ],
    },
    module: {
      id: 'module-001',
      name: '基础篇',
      title: '周易基础知识',
      description: '学习周易的基本概念',
      order: 1,
      icon: '📚',
      estimatedTime: 120,
    },
    published: true,
    quiz: {
      passingScore: 60,
      questions: [
        {
          id: 'q1',
          type: 'single',
          question: '周易的作者是谁？',
          options: [
            { id: 'a', text: '孔子', correct: false },
            { id: 'b', text: '周文王', correct: true },
            { id: 'c', text: '老子', correct: false },
            { id: 'd', text: '孟子', correct: false },
          ],
          points: 10,
        },
        {
          id: 'q2',
          type: 'multiple',
          question: '周易包含哪些内容？（多选）',
          options: [
            { id: 'a', text: '易经', correct: true },
            { id: 'b', text: '易传', correct: true },
            { id: 'c', text: '易学', correct: false },
            { id: 'd', text: '易术', correct: false },
          ],
          points: 20,
        },
      ],
    },
  };

  const mockCourse2 = {
    _id: '507f1f77bcf86cd799439012',
    courseDataId: 'course-002',
    title: '六十四卦详解',
    description: '深入学习六十四卦的含义',
    order: 2,
    duration: 45,
    difficulty: 'intermediate',
    tags: ['六十四卦', '进阶'],
    content: {
      sections: [
        {
          title: '乾卦详解',
          content: '乾卦是六十四卦的第一卦...',
        },
      ],
    },
    module: {
      id: 'module-001',
      name: '基础篇',
      title: '周易基础知识',
      description: '学习周易的基本概念',
      order: 1,
      icon: '📚',
      estimatedTime: 120,
    },
    published: true,
    quiz: {
      passingScore: 70,
      questions: [
        {
          id: 'q3',
          type: 'single',
          question: '乾卦的卦象是什么？',
          options: [
            { id: 'a', text: '䷀', correct: true },
            { id: 'b', text: '䷁', correct: false },
            { id: 'c', text: '䷂', correct: false },
            { id: 'd', text: '䷃', correct: false },
          ],
          points: 10,
        },
      ],
    },
  };

  // Mock learning progress data
  const mockLearningProgress = {
    _id: '507f1f77bcf86cd799439020',
    userId: 'user123',
    courses: [
      {
        id: 'course-001',
        name: '周易基础入门',
        order: 1,
        completed: false,
        readingTime: 10,
      },
      {
        id: 'course-002',
        name: '六十四卦详解',
        order: 2,
        completed: false,
        readingTime: 0,
      },
    ],
    progress: {
      completed: 0,
      total: 2,
      percentage: 0,
    },
    stats: {
      totalReadingTime: 10,
      totalQuizScore: 0,
      averageQuizScore: 0,
      quizAttempts: 0,
    },
    rewards: {
      freeDetailedDivination: {
        available: false,
        used: false,
      },
    },
    save: jest.fn().mockResolvedValue(true),
  };

  const mockSortExec = jest.fn();
  const mockCourseFindOneExec = jest.fn();
  const mockProgressFindOneExec = jest.fn();
  const mockFindOneAndUpdateExec = jest.fn();
  const mockProgressCreate = jest.fn().mockResolvedValue(mockLearningProgress);

  const mockCourseModel = {
    findOne: jest.fn().mockReturnValue({ exec: mockCourseFindOneExec }),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      exec: mockSortExec,
    }),
  };

  // 创建一个可以作为构造函数的 mock
  const mockProgressModel: any = jest.fn().mockImplementation((data) => ({
    ...data,
    save: jest.fn().mockResolvedValue(data),
  }));

  // 添加静态方法
  mockProgressModel.findOne = jest.fn().mockReturnValue({ exec: mockProgressFindOneExec });
  mockProgressModel.findOneAndUpdate = jest.fn().mockReturnValue({ exec: mockFindOneAndUpdateExec });
  mockProgressModel.create = mockProgressCreate;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearningService,
        {
          provide: getModelToken('Course'),
          useValue: mockCourseModel,
        },
        {
          provide: getModelToken('LearningProgress'),
          useValue: mockProgressModel,
        },
      ],
    }).compile();

    service = module.get<LearningService>(LearningService);
    courseModel = module.get<Model<Course>>(getModelToken('Course'));
    progressModel = module.get<Model<LearningProgress>>(getModelToken('LearningProgress'));

    // Reset mocks before each test
    jest.clearAllMocks();

    // Default mock implementations
    mockSortExec.mockResolvedValue([mockCourse1, mockCourse2]);
    mockCourseFindOneExec.mockResolvedValue(mockCourse1);
    mockProgressFindOneExec.mockResolvedValue(mockLearningProgress);
    mockFindOneAndUpdateExec.mockResolvedValue(mockLearningProgress);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllModules', () => {
    it('should return all modules grouped by module', async () => {
      mockSortExec.mockResolvedValue([mockCourse1, mockCourse2]);

      const result = await service.getAllModules();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('基础篇');
      expect(result[0].courses).toHaveLength(2);
      expect(result[0].courses[0].title).toBe('周易基础入门');
      expect(mockCourseModel.find).toHaveBeenCalledWith({ published: true });
    });

    it('should return empty array when no courses exist', async () => {
      mockSortExec.mockResolvedValue([]);

      const result = await service.getAllModules();

      expect(result).toHaveLength(0);
    });

    it('should group courses by module correctly', async () => {
      const mockCourse3 = {
        ...mockCourse2,
        courseDataId: 'course-003',
        module: {
          id: 'module-002',
          name: '进阶篇',
          title: '周易进阶知识',
          description: '深入学习周易',
          order: 2,
          icon: '📖',
          estimatedTime: 180,
        },
      };

      mockSortExec.mockResolvedValue([mockCourse1, mockCourse2, mockCourse3]);

      const result = await service.getAllModules();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('基础篇');
      expect(result[1].name).toBe('进阶篇');
    });
  });

  describe('getCourseDetail', () => {
    it('should return course detail', async () => {
      mockCourseFindOneExec.mockResolvedValue(mockCourse1);

      const result = await service.getCourseDetail('module-001', 'course-001');

      expect(result).toBeDefined();
      expect(result.course.id).toBe('course-001');
      expect(result.course.title).toBe('周易基础入门');
      expect(result.course.content).toBeDefined();
    });

    it('should throw NotFoundException when course not found', async () => {
      mockCourseFindOneExec.mockResolvedValue(null);

      await expect(service.getCourseDetail('module-001', 'invalid-course')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include quiz information if quiz exists', async () => {
      mockCourseFindOneExec.mockResolvedValue(mockCourse1);

      const result = await service.getCourseDetail('module-001', 'course-001');

      expect(result.course.quiz).toBeDefined();
      expect(result.course.quiz.hasQuiz).toBe(true);
      expect(result.course.quiz.questionCount).toBe(2);
    });
  });

  describe('getCourseQuiz', () => {
    it('should return quiz without correct answers', async () => {
      mockCourseFindOneExec.mockResolvedValue(mockCourse1);

      const result = await service.getCourseQuiz('module-001', 'course-001');

      expect(result).toBeDefined();
      expect(result.questions).toHaveLength(2);
      expect(result.questions[0].options[0].correct).toBeUndefined();
      expect(result.passingScore).toBe(60);
    });

    it('should throw NotFoundException when quiz not found', async () => {
      const courseWithoutQuiz = { ...mockCourse1, quiz: undefined };
      mockCourseFindOneExec.mockResolvedValue(courseWithoutQuiz);

      await expect(service.getCourseQuiz('module-001', 'course-001')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when course not found', async () => {
      mockCourseFindOneExec.mockResolvedValue(null);

      await expect(service.getCourseQuiz('module-001', 'invalid-course')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('submitQuiz', () => {
    it('should calculate quiz score correctly', async () => {
      mockCourseFindOneExec.mockResolvedValue(mockCourse1);
      mockProgressFindOneExec.mockResolvedValue(mockLearningProgress);
      mockSortExec.mockResolvedValue([mockCourse1, mockCourse2]);

      const dto = {
        courseId: 'course-001',
        answers: [
          { questionId: 'q1', answers: ['b'] }, // 正确
          { questionId: 'q2', answers: ['a', 'b'] }, // 正确
        ],
      };

      const result = await service.submitQuiz('user123', 'module-001', 'course-001', dto);

      expect(result).toBeDefined();
      expect(result.score).toBe(30); // 10 + 20
      expect(result.totalScore).toBe(30);
      expect(result.percentage).toBe(100);
      expect(result.passed).toBe(true);
      expect(result.correctAnswers).toBe(2);
      expect(result.totalQuestions).toBe(2);
    });

    it('should handle incorrect answers', async () => {
      mockCourseFindOneExec.mockResolvedValue(mockCourse1);
      mockProgressFindOneExec.mockResolvedValue(mockLearningProgress);
      mockSortExec.mockResolvedValue([mockCourse1, mockCourse2]);

      const dto = {
        courseId: 'course-001',
        answers: [
          { questionId: 'q1', answers: ['a'] }, // 错误
          { questionId: 'q2', answers: ['a'] }, // 错误（少选）
        ],
      };

      const result = await service.submitQuiz('user123', 'module-001', 'course-001', dto);

      expect(result.score).toBe(0);
      expect(result.percentage).toBe(0);
      expect(result.passed).toBe(false);
      expect(result.correctAnswers).toBe(0);
    });

    it('should handle partial correct answers', async () => {
      mockCourseFindOneExec.mockResolvedValue(mockCourse1);
      mockProgressFindOneExec.mockResolvedValue(mockLearningProgress);
      mockSortExec.mockResolvedValue([mockCourse1, mockCourse2]);

      const dto = {
        courseId: 'course-001',
        answers: [
          { questionId: 'q1', answers: ['b'] }, // 正确
          { questionId: 'q2', answers: ['a'] }, // 错误（少选）
        ],
      };

      const result = await service.submitQuiz('user123', 'module-001', 'course-001', dto);

      expect(result.score).toBe(10);
      expect(result.percentage).toBe(33); // 10/30 * 100 = 33.33
      expect(result.passed).toBe(false);
      expect(result.correctAnswers).toBe(1);
    });

    it('should throw NotFoundException when quiz not found', async () => {
      const courseWithoutQuiz = { ...mockCourse1, quiz: undefined };
      mockCourseFindOneExec.mockResolvedValue(courseWithoutQuiz);

      const dto = {
        courseId: 'course-001',
        answers: [],
      };

      await expect(
        service.submitQuiz('user123', 'module-001', 'course-001', dto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserProgress', () => {
    it('should return existing user progress', async () => {
      mockProgressFindOneExec.mockResolvedValue(mockLearningProgress);
      mockSortExec.mockResolvedValue([mockCourse1, mockCourse2]);

      const result = await service.getUserProgress('user123');

      expect(result).toBeDefined();
      expect(result.userId).toBe('user123');
      expect(result.courses).toHaveLength(2);
    });

    it('should create new progress if not exists', async () => {
      mockProgressFindOneExec.mockResolvedValueOnce(null);
      mockSortExec.mockResolvedValue([mockCourse1, mockCourse2]);

      const result = await service.getUserProgress('user123');

      expect(result).toBeDefined();
      expect(mockProgressModel).toHaveBeenCalled();
    });

    it('should initialize progress with all courses', async () => {
      mockProgressFindOneExec.mockResolvedValueOnce(null);
      mockSortExec.mockResolvedValue([mockCourse1, mockCourse2]);

      const result = await service.getUserProgress('user123');

      expect(result).toBeDefined();
      expect(result.userId).toBe('user123');
      expect(result.courses).toHaveLength(2);
    });
  });

  describe('updateReadingProgress', () => {
    it('should update reading time', async () => {
      mockProgressFindOneExec.mockResolvedValue(mockLearningProgress);
      mockSortExec.mockResolvedValue([mockCourse1, mockCourse2]);

      const dto = {
        courseId: 'course-001',
        completed: false,
        readingTime: 10,
      };

      const result = await service.updateReadingProgress('user123', dto);

      expect(result).toBeDefined();
    });

    it('should mark course as completed', async () => {
      mockProgressFindOneExec.mockResolvedValue(mockLearningProgress);
      mockSortExec.mockResolvedValue([mockCourse1, mockCourse2]);

      const dto = {
        courseId: 'course-001',
        completed: true,
        readingTime: 20,
      };

      const result = await service.updateReadingProgress('user123', dto);

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when course not found', async () => {
      const progressWithoutCourse = {
        ...mockLearningProgress,
        courses: [],
      };
      mockProgressFindOneExec.mockResolvedValue(progressWithoutCourse);
      mockSortExec.mockResolvedValue([mockCourse1, mockCourse2]);

      const dto = {
        courseId: 'invalid-course',
        completed: false,
        readingTime: 10,
      };

      await expect(service.updateReadingProgress('user123', dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('useCompletionReward', () => {
    it('should use completion reward successfully', async () => {
      const progressWithReward = {
        ...mockLearningProgress,
        rewards: {
          freeDetailedDivination: {
            available: true,
            used: false,
          },
        },
      };
      mockProgressFindOneExec.mockResolvedValue(progressWithReward);

      const result = await service.useCompletionReward('user123', '507f1f77bcf86cd799439011');

      expect(result).toBe(true);
    });

    it('should throw BadRequestException when reward not available', async () => {
      mockProgressFindOneExec.mockResolvedValue(mockLearningProgress);

      await expect(
        service.useCompletionReward('user123', '507f1f77bcf86cd799439011'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when reward already used', async () => {
      const progressWithUsedReward = {
        ...mockLearningProgress,
        rewards: {
          freeDetailedDivination: {
            available: true,
            used: true,
          },
        },
      };
      mockProgressFindOneExec.mockResolvedValue(progressWithUsedReward);

      await expect(
        service.useCompletionReward('user123', '507f1f77bcf86cd799439011'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkCompletionReward', () => {
    it('should return reward availability when available', async () => {
      const progressWithReward = {
        ...mockLearningProgress,
        rewards: {
          freeDetailedDivination: {
            available: true,
            used: false,
          },
        },
      };
      mockProgressFindOneExec.mockResolvedValue(progressWithReward);

      const result = await service.checkCompletionReward('user123');

      expect(result).toEqual({ available: true, used: false });
    });

    it('should return unavailable when reward not exist', async () => {
      const progressWithoutReward = {
        ...mockLearningProgress,
        rewards: undefined,
      };
      mockProgressFindOneExec.mockResolvedValue(progressWithoutReward);

      const result = await service.checkCompletionReward('user123');

      expect(result).toEqual({ available: false, used: false });
    });

    it('should return used when reward already used', async () => {
      const progressWithUsedReward = {
        ...mockLearningProgress,
        rewards: {
          freeDetailedDivination: {
            available: true,
            used: true,
          },
        },
      };
      mockProgressFindOneExec.mockResolvedValue(progressWithUsedReward);

      const result = await service.checkCompletionReward('user123');

      expect(result).toEqual({ available: true, used: true });
    });
  });
});