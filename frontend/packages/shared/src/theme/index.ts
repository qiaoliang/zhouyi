/**
 * 中国风主题配置
 * 传统中国色配色方案
 */

export const Colors = {
  // 主色 - 传统中国色
  primary: '#8B0000',      // 朱红 - 中国红
  secondary: '#D4AF37',    // 古铜金
  accent: '#2C1810',       // 墨黑

  // 背景色
  background: {
    light: '#F5F5DC',    // 米色（宣纸色）
    dark: '#1A1A1A',     // 墨黑
    card: '#FFFAF0',      // 花白
    cardDark: '#2D2D2D',  // 深灰
  },

  // 文字色
  text: {
    primary: '#2C1810',    // 墨黑
    secondary: '#6B4E3D',  // 棕色
    light: '#A0A0A0',     // 浅灰
    inverse: '#FFFFFF',   // 白色
  },

  // 状态色
  success: '#4A7C59',     // 竹青
  warning: '#D4AF37',     // 琥珀
  error: '#8B0000',       // 绛红
  info: '#4A6FA5',       // 靛青

  // 卦象色
  yang: '#DC143C',        // 阳 - 红色
  yin: '#1E3A5F',         // 阴 - 蓝色

  // 装饰色
  border: '#D4C5B9',      // 淡褐
  divider: '#E8E8E8',     // 浅灰
  shadow: 'rgba(44, 24, 16, 0.1)',  // 墨影
};

/**
 * 字体配置
 */
export const Typography = {
  // 标题字体 - 使用书法字体
  titleFont: {
    regular: 'STKaiti',      // 楷体
    medium: 'STKaiti',       // 楷体
    bold: 'STXingkai',       // 行楷
    fallback: 'KaiTi, STKaiti, serif',
  },

  // 正文字体
  bodyFont: {
    regular: 'PingFang SC',
    medium: 'PingFang SC Medium',
    fallback: '-apple-system, BlinkMacSystemFont, sans-serif',
  },

  // 字号
  fontSize: {
    xxl: 32,   // 超大标题
    xl: 28,    // 特大标题
    lg: 24,    // 大标题
    md: 20,    // 标题
    base: 16,  // 正文
    sm: 14,    // 小字
    xs: 12,    // 特小
  },

  // 行高
  lineHeight: {
    title: 1.4,
    body: 1.6,
    dense: 1.2,
  },
};

/**
 * 间距配置 - 基于8px网格
 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

/**
 * 圆角配置
 */
export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

/**
 * 阴影配置
 */
export const Shadows = {
  small: {
    shadowColor: 'rgba(44, 24, 16, 0.1)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: 'rgba(44, 24, 16, 0.15)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: 'rgba(44, 24, 16, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
};

/**
 * 主题对象
 */
export const Theme = {
  // 默认使用浅色主题
  ...Colors,
  ...Typography,
  ...Spacing,
  ...BorderRadius,
  ...Shadows,
  isDark: false,

  // 浅色主题
  light: {
    ...Colors,
    ...Typography,
    ...Spacing,
    ...BorderRadius,
    ...Shadows,
    isDark: false,
  },
  // 深色主题
  dark: {
    ...Colors,
    background: {
      light: '#1A1A1A',
      dark: '#F5F5DC',
      card: '#2D2D2D',
      cardDark: '#FFFAF0',
    },
    text: {
      primary: '#F5F5DC',
      secondary: '#D4C5B9',
      light: '#A0A0A0',
      inverse: '#2C1810',
    },
    ...Typography,
    ...Spacing,
    ...BorderRadius,
    ...Shadows,
    isDark: true,
  },
};

/**
 * 卦象符号Unicode
 */
export const HexagramSymbols = [
  '䷀', '䷁', '䷂', '䷃', '䷄', '䷅', '䷆', '䷇',
  '䷈', '䷉', '䷊', '䷋', '䷌', '䷍', '䷎', '䷏',
  '䷐', '䷑', '䷒', '䷓', '䷔', '䷕', '䷖', '䷗',
  '䷘', '䷙', '䷚', '䷛', '䷜', '䷝', '䷞', '䷟',
  '䷠', '䷡', '䷢', '䷣', '䷤', '䷥', '䷦', '䷧',
  '䷨', '䷩', '䷪', '䷫', '䷬', '䷭', '䷮', '䷯',
  '䷰', '䷱', '䷲', '䷳', '䷴', '䷵', '䷶', '䷷',
  '䷸', '䷹', '䷺', '䷻', '䷼', '䷽', '䷾', '䷿',
];

/**
 * 八卦符号
 */
export const TrigramSymbols = {
  heaven: '☰',    // 乾
  earth: '☷',     // 坤
  thunder: '☳',   // 震
  wind: '☴',      // 巽
  water: '☵',     // 坎
  fire: '☲',      // 离
  mountain: '☶',  // 艮
  lake: '☱',      // 兑
};
