/**
 * 课程阅读器页面 - 微信小程序
 * 用于阅读课程内容
 */

import { useState, useEffect } from 'react'
import { View, Text, ScrollView, Button, RichText } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useRouter } from '@tarojs/taro'
import { learningService } from '@zhouyi/shared/services/learning'
import './index.scss'

interface QuizQuestion {
  id: string
  question: string
  options: {
    id: string
    text: string
  }[]
  correctAnswer: string
}

interface Quiz {
  id: string
  title: string
  questions: QuizQuestion[]
  passingScore: number
}

function CourseReaderPage() {
  const router = useRouter()
  const moduleId = router.params.moduleId
  const courseId = router.params.courseId

  const [course, setCourse] = useState<any>(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [completed, setCompleted] = useState(false)
  const [showQuiz, setShowQuiz] = useState(false)
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})

  useEffect(() => {
    loadCourse()
  }, [])

  /**
   * 加载课程内容
   */
  const loadCourse = async () => {
    if (!moduleId || !courseId) {
      Taro.showToast({
        title: '参数错误',
        icon: 'none'
      })
      return
    }

    try {
      setLoading(true)
      const detail = await learningService.getCourseDetail(moduleId, courseId)
      setCourse(detail)

      // 模拟课程内容
      setContent(detail.content || generateMockContent(detail.title))
    } catch (error) {
      console.error('加载课程失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  /**
   * 生成模拟内容
   */
  const generateMockContent = (title: string) => {
    return `
      <h1>${title}</h1>
      <p>这是课程的详细内容。易经是中国古代最重要的经典之一，被誉为"群经之首"。</p>
      <h2>一、易经的起源</h2>
      <p>易经起源于周朝，经过长时间的积累和发展，最终形成了我们今天看到的完整体系。</p>
      <h2>二、基本概念</h2>
      <p>易经的基本概念包括阴阳、八卦、六十四卦等。阴阳是宇宙间两种相对的力量，八卦是由阴阳组合而成的八个基本符号。</p>
      <h2>三、应用</h2>
      <p>易经在古代被广泛应用于占卜、哲学思考、军事战略等领域，至今仍具有重要的研究和参考价值。</p>
    `
  }

  /**
   * 标记为完成
   */
  const handleComplete = async () => {
    try {
      await learningService.updateReadingProgress(courseId, true, 0)
      setCompleted(true)

      // 显示完成提示
      Taro.showToast({
        title: '已完成',
        icon: 'success'
      })
    } catch (error) {
      console.error('标记完成失败:', error)
    }
  }

  /**
   * 开始测验
   */
  const handleStartQuiz = async () => {
    try {
      const quizData = await learningService.getCourseQuiz(moduleId, courseId)
      setQuiz(quizData)
      setShowQuiz(true)
    } catch (error) {
      console.error('加载测验失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  }

  /**
   * 选择答案
   */
  const handleSelectAnswer = (questionId: string, optionId: string) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionId]: optionId
    })
  }

  /**
   * 提交测验
   */
  const handleSubmitQuiz = async () => {
    if (!quiz) return

    try {
      const result = await learningService.submitQuiz(moduleId, courseId, {
        answers: selectedAnswers
      })

      if (result.passed) {
        Taro.showModal({
          title: '恭喜通过',
          content: `得分：${result.score}/${result.totalScore}`,
          showCancel: false,
          success: () => {
            Taro.navigateBack()
          }
        })
      } else {
        Taro.showModal({
          title: '未通过',
          content: `得分：${result.score}/${result.totalScore}，请继续学习后再试`,
          showCancel: false
        })
      }
    } catch (error) {
      console.error('提交测验失败:', error)
      Taro.showToast({
        title: '提交失败',
        icon: 'none'
      })
    }
  }

  if (loading) {
    return (
      <View className='course-reader-page loading'>
        <Text>加载中...</Text>
      </View>
    )
  }

  if (!course) {
    return (
      <View className='course-reader-page empty'>
        <Text>课程不存在</Text>
      </View>
    )
  }

  // 测验模式
  if (showQuiz && quiz) {
    return (
      <View className='course-reader-page'>
        <View className='quiz-header'>
          <Text className='quiz-title'>{quiz.title}</Text>
          <Text className='quiz-info'>
            共{quiz.questions.length}题，及格分：{quiz.passingScore}分
          </Text>
        </View>

        <ScrollView className='quiz-content' scrollY>
          {quiz.questions.map(question => (
            <View key={question.id} className='question-item'>
              <Text className='question-text'>{question.question}</Text>
              <View className='options-list'>
                {question.options.map(option => (
                  <View
                    key={option.id}
                    className={`option-item ${selectedAnswers[question.id] === option.id ? 'selected' : ''}`}
                    onClick={() => handleSelectAnswer(question.id, option.id)}
                  >
                    <Text className='option-text'>{option.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>

        <View className='quiz-footer'>
          <Button
            className='submit-button'
            onClick={handleSubmitQuiz}
            disabled={Object.keys(selectedAnswers).length < quiz.questions.length}
          >
            提交答案
          </Button>
        </View>
      </View>
    )
  }

  // 阅读模式
  return (
    <View className='course-reader-page'>
      {/* 课程头部 */}
      <View className='course-header'>
        <Text className='course-title'>{course.title}</Text>
        <Text className='course-desc'>{course.description}</Text>
        <Text className='course-duration'>⏱ {course.duration} 分钟</Text>
      </View>

      {/* 课程内容 */}
      <ScrollView className='course-content' scrollY>
        <RichText className='rich-text' nodes={content} />
      </ScrollView>

      {/* 底部操作 */}
      <View className='course-footer'>
        {!completed ? (
          <Button className='complete-button' onClick={handleComplete}>
            标记为完成
          </Button>
        ) : (
          <Button className='quiz-button' onClick={handleStartQuiz}>
            参加测验
          </Button>
        )}
      </View>
    </View>
  )
}

export default CourseReaderPage
