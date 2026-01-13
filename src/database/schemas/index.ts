/**
 * 数据库 Schema 导出
 * 统一导出所有 Mongoose Schema
 *
 * 注意：内部接口类型请直接从各自的schema文件导入，避免命名冲突
 */

// 用户相关
export { User, UserDocument, UserSchema } from './user.schema';
export type { UserStatus, MembershipType, MembershipLevel, Gender } from './user.schema';

// 卜卦记录相关
export { DivinationRecord, DivinationRecordDocument, DivinationRecordSchema } from './divination-record.schema';
export type { YinYang } from './divination-record.schema';

// 六十四卦相关
export { Hexagram, HexagramDocument, HexagramSchema } from './hexagram.schema';

// 订单相关
export { Order, OrderDocument, OrderSchema } from './order.schema';
export type { OrderType, PaymentMethod, PaymentChannel, PaymentStatus, OrderStatus, Platform } from './order.schema';

// 学习进度相关
export { LearningProgress, LearningProgressDocument, LearningProgressSchema } from './learning-progress.schema';

// 课程相关
export { Course, CourseDocument, CourseSchema } from './course.schema';

// 每日一卦相关
export { DailyHexagram, DailyHexagramDocument, DailyHexagramSchema } from './daily-hexagram.schema';
