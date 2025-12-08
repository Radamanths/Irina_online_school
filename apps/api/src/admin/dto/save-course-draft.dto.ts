import { Type } from "class-transformer";
import { IsArray, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from "class-validator";

const COURSE_STATUS = ["running", "enrollment", "maintenance", "archived"] as const;
const COURSE_LANGUAGES = ["RU", "EN"] as const;
const MODULE_STAGE = ["draft", "review", "published"] as const;

type CourseStatusInput = (typeof COURSE_STATUS)[number];
type CourseLanguageInput = (typeof COURSE_LANGUAGES)[number];
type ModuleStageInput = (typeof MODULE_STAGE)[number];

export class ModuleDraftDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  owner!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  lessons!: number;

  @IsIn(MODULE_STAGE as readonly string[])
  stage!: ModuleStageInput;

  @IsOptional()
  @IsString()
  summary?: string;
}

export class SaveCourseDraftDto {
  @IsString()
  @IsNotEmpty()
  titleRu!: string;

  @IsOptional()
  @IsString()
  titleEn?: string;

  @IsString()
  @IsNotEmpty()
  mentor!: string;

  @IsString()
  @IsNotEmpty()
  cohort!: string;

  @IsIn(COURSE_STATUS as readonly string[])
  status!: CourseStatusInput;

  @IsString()
  @IsNotEmpty()
  descriptionRu!: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @IsIn(COURSE_LANGUAGES as readonly string[])
  language!: CourseLanguageInput;

  @IsString()
  timezone!: string;

  @IsString()
  format!: string;

  @IsString()
  startDate!: string;

  @IsString()
  endDate!: string;

  @IsString()
  capacity!: string;

  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;

  @IsOptional()
  @IsString()
  seoKeywords?: string;

  @IsOptional()
  @IsString()
  seoImage?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModuleDraftDto)
  modules!: ModuleDraftDto[];
}
