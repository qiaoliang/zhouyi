/**
 * 学习路径页面
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {Theme} from '@zhouyi/shared/theme';
import {learningService} from '@zhouyi/shared/services/learning';
import {Course, LearningProgress, Lesson} from '@zhouyi/shared/types';
import {useNavigation} from '@react-navigation/native';

/**
 * 课程卡片组件
 */
interface CourseCardProps {
  course: Course;
  progress?: LearningProgress;
  onPress: (course: Course) => void;
}

function CourseCard({course, progress, onPress}: CourseCardProps): React.JSX.Element {
  const progressPercent = progress
    ? Math.round((progress.completedLessons / progress.totalLessons) * 100)
    : 0;

  return (
    <TouchableOpacity style={styles.courseCard} onPress={() => onPress(course)}>
      <View style={styles.courseHeader}>
        <View style={styles.courseIcon}>
          <Icon name={course.icon as any} size={32} color={Theme.primary} />
        </View>
        <View style={styles.courseInfo}>
          <Text style={styles.courseTitle}>{course.title}</Text>
          <Text style={styles.courseDescription} numberOfLines={2}>
            {course.description}
          </Text>
        </View>
      </View>

      <View style={styles.courseMeta}>
        <View style={styles.metaItem}>
          <Icon name="ios-book-outline" size={16} color={Theme.text.secondary} />
          <Text style={styles.metaText}>{course.lessonCount}课时</Text>
        </View>
        <View style={styles.metaItem}>
          <Icon name="ios-time-outline" size={16} color={Theme.text.secondary} />
          <Text style={styles.metaText}>{course.duration}</Text>
        </View>
        <View style={styles.metaItem}>
          <Icon name="ios-trophy-outline" size={16} color={Theme.secondary} />
          <Text style={styles.metaText}>{course.xpReward}经验</Text>
        </View>
      </View>

      {progressPercent > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, {width: `${progressPercent}%`}]} />
          </View>
          <Text style={styles.progressText}>{progressPercent}%</Text>
        </View>
      )}

      {course.isLocked ? (
        <View style={styles.lockedOverlay}>
          <Icon name="ios-lock-closed" size={24} color={Theme.text.secondary} />
          <Text style={styles.lockedText}>
            {course.unlockCondition || '完成前置课程解锁'}
          </Text>
        </View>
      ) : progressPercent === 100 ? (
        <View style={styles.completedBadge}>
          <Icon name="ios-checkmark-circle" size={20} color={Theme.primary} />
          <Text style={styles.completedText}>已完成</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

/**
 * 课程阅读器组件
 */
interface CourseReaderProps {
  course: Course;
  visible: boolean;
  onClose: () => void;
}

function CourseReader({course, visible, onClose}: CourseReaderProps): React.JSX.Element {
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const currentLesson = course.lessons[currentLessonIndex];
  const isLastLesson = currentLessonIndex === course.lessons.length - 1;

  const handleAnswer = (answerId: string) => {
    setSelectedAnswer(answerId);
    const correct = currentLesson.quiz?.correctAnswer === answerId;
    setIsCorrect(correct ?? false);
    setShowResult(true);
  };

  const handleNext = () => {
    if (isLastLesson) {
      onClose();
    } else {
      setCurrentLessonIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.readerContainer}>
        {/* 头部 */}
        <View style={styles.readerHeader}>
          <TouchableOpacity onPress={onClose} style={styles.readerBackButton}>
            <Icon name="ios-arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.readerTitle}>{course.title}</Text>
          <View style={styles.readerHeaderRight} />
        </View>

        {/* 进度 */}
        <View style={styles.lessonProgress}>
          <Text style={styles.lessonProgressText}>
            第{currentLessonIndex + 1}课 / 共{course.lessons.length}课
          </Text>
          <View style={styles.lessonProgressBar}>
            <View
              style={[
                styles.lessonProgressFill,
                {width: `${((currentLessonIndex + 1) / course.lessons.length) * 100}%`},
              ]}
            />
          </View>
        </View>

        {/* 内容 */}
        <ScrollView style={styles.readerContent} contentContainerStyle={styles.readerContentContainer}>
          <Text style={styles.lessonTitle}>{currentLesson.title}</Text>

          {currentLesson.content.map((paragraph, index) => (
            <Text key={index} style={styles.lessonParagraph}>
              {paragraph}
            </Text>
          ))}

          {/* 测验 */}
          {currentLesson.quiz && (
            <View style={styles.quizContainer}>
              <Text style={styles.quizTitle}>课后测验</Text>
              <Text style={styles.quizQuestion}>{currentLesson.quiz.question}</Text>

              <View style={styles.quizOptions}>
                {currentLesson.quiz.options.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.quizOption,
                      selectedAnswer === option.id && styles.quizOptionSelected,
                      showResult && option.id === currentLesson.quiz?.correctAnswer && styles.quizOptionCorrect,
                      showResult &&
                        selectedAnswer === option.id &&
                        option.id !== currentLesson.quiz?.correctAnswer &&
                        styles.quizOptionWrong,
                    ]}
                    onPress={() => !showResult && handleAnswer(option.id)}
                    disabled={showResult}>
                    <View style={styles.quizOptionRadio}>
                      {showResult && option.id === currentLesson.quiz?.correctAnswer ? (
                        <Icon name="ios-checkmark-circle" size={20} color="#4A7C59" />
                      ) : showResult &&
                        selectedAnswer === option.id &&
                        option.id !== currentLesson.quiz?.correctAnswer ? (
                        <Icon name="ios-close-circle" size={20} color="#E04F5F" />
                      ) : (
                        <View
                          style={[
                            styles.quizOptionRadioDot,
                            selectedAnswer === option.id && styles.quizOptionRadioDotSelected,
                          ]}
                        />
                      )}
                    </View>
                    <Text style={styles.quizOptionText}>{option.text}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {showResult && (
                <View style={styles.quizResult}>
                  <Text style={[styles.quizResultText, isCorrect && styles.quizResultTextCorrect]}>
                    {isCorrect ? '回答正确！' : '回答错误'}
                  </Text>
                  {!isCorrect && currentLesson.quiz.explanation && (
                    <Text style={styles.quizExplanation}>{currentLesson.quiz.explanation}</Text>
                  )}
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* 底部按钮 */}
        <View style={styles.readerFooter}>
          <TouchableOpacity
            style={[styles.readerButton, !showResult && !isLastLesson && styles.readerButtonDisabled]}
            onPress={handleNext}
            disabled={!showResult && !isLastLesson}>
            <Text style={styles.readerButtonText}>
              {isLastLesson ? '完成课程' : '下一课'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/**
 * 学习页面组件
 */
function LearningScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const [courses, setCourses] = useState<Course[]>([]);
  const [progress, setProgress] = useState<Record<string, LearningProgress>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showReader, setShowReader] = useState(false);

  const categories = [
    {id: 'all', name: '全部'},
    {id: 'beginner', name: '入门'},
    {id: 'intermediate', name: '进阶'},
    {id: 'advanced', name: '高级'},
  ];

  useEffect(() => {
    loadCourses();
  }, []);

  /**
   * 加载课程列表
   */
  const loadCourses = async () => {
    try {
      setLoading(true);
      // 模拟数据
      const mockCourses: Course[] = [
        {
          id: '1',
          title: '六十四卦解读方法',
          description: '学习如何解读六十四卦的含义和象征',
          icon: 'ios-compass',
          category: 'beginner',
          lessonCount: 5,
          duration: '15分钟',
          xpReward: 50,
          isLocked: false,
          unlockCondition: '',
          lessons: [
            {
              id: '1-1',
              title: '第一课：卦象基础',
              content: [
                '卦象是周易的基本组成单位，由六爻组成。阳爻（—）代表阳性、刚强、主动；阴爻（- -）代表阴性、柔顺、被动。',
                '六十四卦由八卦两两相叠而成，上卦代表天、地、雷、风、水、火、山、泽八种自然现象。',
                '学习卦象需要理解其象征意义和相互关系，这需要长期的实践和体悟。',
              ],
              quiz: {
                question: '阳爻的符号是什么？',
                options: [
                  {id: 'a', text: '（—）'},
                  {id: 'b', text: '（- -）'},
                ],
                correctAnswer: 'a',
                explanation: '阳爻用一条连续的横线（—）表示，代表阳性、刚强、主动。',
              },
            },
            {
              id: '1-2',
              title: '第二课：八卦象征',
              content: [
                '八卦代表八种自然现象：乾为天、坤为地、震为雷、巽为风、坎为水、离为火、艮为山、兑为泽。',
                '每种卦象都有其独特的属性和象征意义，需要深入理解。',
                '八卦之间的相互作用和变化，构成了六十四卦的丰富内涵。',
              ],
              quiz: {
                question: '坤卦代表什么？',
                options: [
                  {id: 'a', text: '天'},
                  {id: 'b', text: '地'},
                  {id: 'c', text: '水'},
                ],
                correctAnswer: 'b',
                explanation: '坤卦代表大地，象征母性、承载、包容等。',
              },
            },
            {
              id: '1-3',
              title: '第三课：六十四卦结构',
              content: [
                '六十四卦由上卦和下卦组成，上三爻为上卦，下三爻为下卦。',
                '每个卦都有其独特的名称、卦辞和爻辞。',
                '理解卦的结构是解读卦象的基础。',
              ],
            },
            {
              id: '1-4',
              title: '第四课：卦辞解读',
              content: [
                '卦辞是对整个卦象的解释，包含卦的基本含义和应用。',
                '解读卦辞需要结合卦象的组成和爻的变化。',
                '卦辞往往包含哲理和智慧，需要细细体悟。',
              ],
            },
            {
              id: '1-5',
              title: '第五课：实践应用',
              content: [
                '通过实际起卦和解读，加深对卦象的理解。',
                '在实践中学习和进步，不断提升自己的解读能力。',
                '记住，周易是一门需要长期实践的学问。',
              ],
            },
          ],
        },
        {
          id: '2',
          title: '如何起卦',
          description: '学习金钱课起卦的方法和步骤',
          icon: 'ios-hand-left',
          category: 'beginner',
          lessonCount: 3,
          duration: '10分钟',
          xpReward: 30,
          isLocked: false,
          lessons: [
            {
              id: '2-1',
              title: '第一课：起卦准备',
              content: [
                '起卦前需要静心，明确自己要问的问题。',
                '问题要具体明确，不能模棱两可。',
                '保持诚敬之心，这是起卦的基本要求。',
              ],
            },
            {
              id: '2-2',
              title: '第二课：金钱课方法',
              content: [
                '金钱课是用三枚铜钱掷六次，每次掷出一爻。',
                '一个字为阴爻，两个字为阳爻，三个字为老阳（变爻），三个背为老阴（变爻）。',
                '记录下每次的结果，从下到上排列，就得到了一个卦象。',
              ],
            },
            {
              id: '2-3',
              title: '第三课：起卦实践',
              content: [
                '按照刚才学到的方法，亲自起一卦。',
                '记录下卦象和起卦时的所问所想。',
                '通过实践加深对起卦方法的理解。',
              ],
            },
          ],
        },
        {
          id: '3',
          title: '周易起源与历史',
          description: '了解周易的历史渊源和文化价值',
          icon: 'ios-time',
          category: 'beginner',
          lessonCount: 4,
          duration: '12分钟',
          xpReward: 40,
          isLocked: false,
          lessons: [],
        },
        {
          id: '4',
          title: '八卦详解',
          description: '深入学习八卦的象征意义和应用',
          icon: 'ios-planet',
          category: 'intermediate',
          lessonCount: 8,
          duration: '25分钟',
          xpReward: 80,
          isLocked: true,
          unlockCondition: '完成入门课程',
          lessons: [],
        },
        {
          id: '5',
          title: '如何看卦',
          description: '掌握看卦的基本方法和技巧',
          icon: 'ios-eye',
          category: 'intermediate',
          lessonCount: 6,
          duration: '20分钟',
          xpReward: 60,
          isLocked: true,
          unlockCondition: '完成入门课程',
          lessons: [],
        },
      ];

      const mockProgress: Record<string, LearningProgress> = {};

      setCourses(mockCourses);
      setProgress(mockProgress);
    } catch (error) {
      console.error('加载课程失败:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 处理课程点击
   */
  const handleCoursePress = (course: Course) => {
    if (course.isLocked) {
      Alert.alert('提示', course.unlockCondition || '请先完成前置课程');
      return;
    }

    if (course.lessons && course.lessons.length > 0) {
      setSelectedCourse(course);
      setShowReader(true);
    }
  };

  /**
   * 过滤课程
   */
  const [selectedCategory, setSelectedCategory] = useState('all');
  const filteredCourses = courses.filter(course => {
    if (selectedCategory === 'all') return true;
    return course.category === selectedCategory;
  });

  /**
   * 渲染分类标签
   */
  const renderCategory = (category: {id: string; name: string}) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryTab,
        selectedCategory === category.id && styles.categoryTabActive,
      ]}
      onPress={() => setSelectedCategory(category.id)}>
      <Text
        style={[
          styles.categoryText,
          selectedCategory === category.id && styles.categoryTextActive,
        ]}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );

  /**
   * 渲染课程卡片
   */
  const renderCourse = ({item}: {item: Course}) => (
    <CourseCard course={item} progress={progress[item.id]} onPress={handleCoursePress} />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.primary} />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>学习路径</Text>
        <Text style={styles.headerSubtitle}>循序渐进，研习周易</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {Object.values(progress).filter(p => p.completed).length}
          </Text>
          <Text style={styles.statLabel}>已完成</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {Object.values(progress).reduce((sum, p) => sum + p.readingTime, 0)}
          </Text>
          <Text style={styles.statLabel}>学习分钟</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {Object.values(progress).reduce((sum, p) => sum + p.earnedXP, 0)}
          </Text>
          <Text style={styles.statLabel}>获得经验</Text>
        </View>
      </View>

      <View style={styles.categoryContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          renderItem={({item}) => renderCategory(item)}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.categoryList}
        />
      </View>

      <FlatList
        data={filteredCourses}
        renderItem={renderCourse}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.courseList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="ios-book-outline" size={60} color={Theme.text.secondary} />
            <Text style={styles.emptyText}>暂无课程</Text>
          </View>
        }
      />

      {/* 课程阅读器 */}
      {selectedCourse && (
        <CourseReader
          course={selectedCourse}
          visible={showReader}
          onClose={() => {
            setShowReader(false);
            setSelectedCourse(null);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.background.light,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.background.light,
  },
  loadingText: {
    marginTop: 12,
    fontSize: Theme.fontSize.md,
    color: Theme.text.secondary,
  },
  header: {
    padding: 20,
    backgroundColor: Theme.primary,
  },
  headerTitle: {
    fontSize: Theme.fontSize.xxl,
    fontFamily: Theme.titleFont.bold,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: Theme.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: Theme.fontSize.xxl,
    fontFamily: Theme.titleFont.bold,
    color: Theme.primary,
  },
  statLabel: {
    fontSize: Theme.fontSize.xs,
    color: Theme.text.secondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: Theme.border,
    marginHorizontal: 16,
  },
  categoryContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Theme.border,
  },
  categoryList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: Theme.background.light,
  },
  categoryTabActive: {
    backgroundColor: Theme.primary,
  },
  categoryText: {
    fontSize: Theme.fontSize.sm,
    color: Theme.text.secondary,
  },
  categoryTextActive: {
    color: '#FFFFFF',
    fontFamily: Theme.titleFont.medium,
  },
  courseList: {
    padding: 16,
  },
  courseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  courseHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  courseIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Theme.background.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  courseInfo: {
    flex: 1,
  },
  courseTitle: {
    fontSize: Theme.fontSize.lg,
    fontFamily: Theme.titleFont.medium,
    color: Theme.text.primary,
    marginBottom: 4,
  },
  courseDescription: {
    fontSize: Theme.fontSize.sm,
    color: Theme.text.secondary,
    lineHeight: 20,
  },
  courseMeta: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: Theme.fontSize.xs,
    color: Theme.text.secondary,
    marginLeft: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: Theme.background.light,
    borderRadius: 3,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Theme.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: Theme.fontSize.sm,
    fontFamily: Theme.titleFont.medium,
    color: Theme.primary,
  },
  lockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedText: {
    fontSize: Theme.fontSize.sm,
    color: Theme.text.secondary,
    marginTop: 8,
  },
  completedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.background.light,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedText: {
    fontSize: Theme.fontSize.xs,
    color: Theme.primary,
    marginLeft: 4,
    fontFamily: Theme.titleFont.medium,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: Theme.fontSize.md,
    color: Theme.text.secondary,
    marginTop: 12,
  },
  // 课程阅读器样式
  readerContainer: {
    flex: 1,
    backgroundColor: Theme.background.light,
  },
  readerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  readerBackButton: {
    padding: 8,
  },
  readerTitle: {
    fontSize: Theme.fontSize.lg,
    fontFamily: Theme.titleFont.medium,
    color: '#FFFFFF',
  },
  readerHeaderRight: {
    width: 40,
  },
  lessonProgress: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.border,
  },
  lessonProgressText: {
    fontSize: Theme.fontSize.sm,
    color: Theme.text.secondary,
    marginBottom: 8,
  },
  lessonProgressBar: {
    height: 4,
    backgroundColor: Theme.background.light,
    borderRadius: 2,
  },
  lessonProgressFill: {
    height: '100%',
    backgroundColor: Theme.primary,
    borderRadius: 2,
  },
  readerContent: {
    flex: 1,
  },
  readerContentContainer: {
    padding: 20,
  },
  lessonTitle: {
    fontSize: Theme.fontSize.xl,
    fontFamily: Theme.titleFont.bold,
    color: Theme.text.primary,
    marginBottom: 20,
  },
  lessonParagraph: {
    fontSize: Theme.fontSize.md,
    color: Theme.text.primary,
    lineHeight: 26,
    marginBottom: 16,
  },
  quizContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  quizTitle: {
    fontSize: Theme.fontSize.lg,
    fontFamily: Theme.titleFont.bold,
    color: Theme.text.primary,
    marginBottom: 12,
  },
  quizQuestion: {
    fontSize: Theme.fontSize.md,
    color: Theme.text.primary,
    marginBottom: 16,
  },
  quizOptions: {
    gap: 12,
  },
  quizOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.background.light,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  quizOptionSelected: {
    borderColor: Theme.primary,
    backgroundColor: 'rgba(139, 0, 0, 0.05)',
  },
  quizOptionCorrect: {
    borderColor: '#4A7C59',
    backgroundColor: 'rgba(74, 124, 89, 0.1)',
  },
  quizOptionWrong: {
    borderColor: '#E04F5F',
    backgroundColor: 'rgba(224, 79, 95, 0.1)',
  },
  quizOptionRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Theme.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quizOptionRadioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Theme.border,
  },
  quizOptionRadioDotSelected: {
    backgroundColor: Theme.primary,
  },
  quizOptionText: {
    flex: 1,
    fontSize: Theme.fontSize.md,
    color: Theme.text.primary,
  },
  quizResult: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: Theme.background.light,
  },
  quizResultText: {
    fontSize: Theme.fontSize.md,
    fontFamily: Theme.titleFont.medium,
    color: Theme.text.secondary,
    textAlign: 'center',
  },
  quizResultTextCorrect: {
    color: '#4A7C59',
  },
  quizExplanation: {
    fontSize: Theme.fontSize.sm,
    color: Theme.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  readerFooter: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Theme.border,
  },
  readerButton: {
    backgroundColor: Theme.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  readerButtonDisabled: {
    backgroundColor: Theme.background.light,
    opacity: 0.6,
  },
  readerButtonText: {
    fontSize: Theme.fontSize.md,
    fontFamily: Theme.titleFont.medium,
    color: '#FFFFFF',
  },
});

export default LearningScreen;
