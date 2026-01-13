import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDateString } from 'class-validator';

/**
 * 性别枚举
 */
export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
}

/**
 * 精准解卦信息DTO
 */
export class PreciseInterpretationDto {
  /**
   * 姓名
   */
  @IsString()
  @IsNotEmpty()
  name: string;

  /**
   * 性别
   */
  @IsEnum(Gender)
  @IsNotEmpty()
  gender: Gender;

  /**
   * 出生日期 (ISO 8601格式)
   */
  @IsDateString()
  @IsNotEmpty()
  birthDate: string;

  /**
   * 占问事项
   */
  @IsString()
  @IsNotEmpty()
  question: string;
}

/**
 * 更新精准信息DTO
 */
export class UpdatePreciseInfoDto {
  /**
   * 姓名
   */
  @IsString()
  @IsNotEmpty()
  name: string;

  /**
   * 性别
   */
  @IsEnum(Gender)
  @IsNotEmpty()
  gender: Gender;

  /**
   * 出生日期 (ISO 8601格式)
   */
  @IsDateString()
  @IsNotEmpty()
  birthDate: string;

  /**
   * 占问事项
   */
  @IsString()
  @IsNotEmpty()
  question: string;
}
