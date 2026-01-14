/**
 * 农历工具类
 * 提供农历日期转换和格式化功能
 */

export interface LunarDate {
  year: number;
  month: number;
  day: number;
  leap: boolean; // 是否闰月
}

export interface SolarDate {
  year: number;
  month: number;
  day: number;
}

/**
 * 农历月份名称
 */
export const LUNAR_MONTHS = [
  '正月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '冬月', '腊月'
];

/**
 * 农历日期名称
 */
export const LUNAR_DAYS = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
];

/**
 * 生肖名称
 */
export const ZODIAC_ANIMALS = [
  '鼠', '牛', '虎', '兔', '龙', '蛇',
  '马', '羊', '猴', '鸡', '狗', '猪'
];

/**
 * 农历工具类
 */
export class LunarUtils {
  /**
   * 格式化农历日期为中文
   */
  static formatLunar(lunar: LunarDate): string {
    const monthStr = LUNAR_MONTHS[lunar.month - 1];
    const dayStr = LUNAR_DAYS[lunar.day - 1];
    return `${monthStr}${dayStr}`;
  }

  /**
   * 格式化公历日期
   */
  static formatSolar(solar: SolarDate): string {
    return `${solar.year}-${String(solar.month).padStart(2, '0')}-${String(solar.day).padStart(2, '0')}`;
  }

  /**
   * 获取生肖
   */
  static getZodiac(year: number): string {
    return ZODIAC_ANIMALS[(year - 4) % 12];
  }

  /**
   * 农历转公历（简化版本，仅供参考）
   * 注意：这是简化实现，实际应用建议使用专业农历库
   */
  static lunarToSolar(lunar: LunarDate): SolarDate {
    // 这里使用简化的转换逻辑
    // 实际项目中建议使用 lunar-javascript 库
    const year = lunar.year;
    const month = lunar.month;
    const day = lunar.day;

    // 简化处理：假设农历比公历晚约1个月
    // 这不是精确的转换，仅用于演示
    let solarMonth = month + 1;
    let solarYear = year;

    if (solarMonth > 12) {
      solarMonth -= 12;
      solarYear += 1;
    }

    return {
      year: solarYear,
      month: solarMonth,
      day: Math.min(day, 31) // 简化处理
    };
  }

  /**
   * 公历转农历（简化版本）
   */
  static solarToLunar(solar: SolarDate): LunarDate {
    // 简化处理：假设农历比公历早约1个月
    let lunarMonth = solar.month - 1;
    let lunarYear = solar.year;

    if (lunarMonth < 1) {
      lunarMonth += 12;
      lunarYear -= 1;
    }

    return {
      year: lunarYear,
      month: lunarMonth,
      day: Math.min(solar.day, 30), // 农历最多30天
      leap: false
    };
  }

  /**
   * 验证农历日期
   */
  static isValidLunar(lunar: LunarDate): boolean {
    if (lunar.month < 1 || lunar.month > 12) return false;
    if (lunar.day < 1 || lunar.day > 30) return false; // 农历最多30天
    return true;
  }

  /**
   * 验证公历日期
   */
  static isValidSolar(solar: SolarDate): boolean {
    if (solar.month < 1 || solar.month > 12) return false;
    const maxDay = new Date(solar.year, solar.month, 0).getDate();
    if (solar.day < 1 || solar.day > maxDay) return false;
    return true;
  }
}

/**
 * 农历日期选择器数据生成器
 */
export class LunarDatePicker {
  /**
   * 生成年份选项（前后50年）
   */
  static generateYears(): number[] {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];

    for (let i = 50; i >= 0; i--) {
      years.push(currentYear - i);
    }

    return years;
  }

  /**
   * 生成农历月份选项
   */
  static generateMonths(): Array<{value: number; label: string}> {
    return LUNAR_MONTHS.map((label, index) => ({
      value: index + 1,
      label: label
    }));
  }

  /**
   * 生成农历日期选项
   */
  static generateDays(): Array<{value: number; label: string}> {
    return LUNAR_DAYS.map((label, index) => ({
      value: index + 1,
      label: label
    }));
  }

  /**
   * 生成农历生肖年份
   */
  static generateZodiacYears(): Array<{value: number; label: string}> {
    const currentYear = new Date().getFullYear();
    const years: Array<{value: number; label: string}> = [];

    for (let i = 60; i >= 0; i--) {
      const year = currentYear - i;
      years.push({
        value: year,
        label: `${year}年 (${LunarUtils.getZodiac(year)})`
      });
    }

    return years;
  }
}
