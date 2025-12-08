import { IsInt, IsIn, IsOptional, IsString, Min } from "class-validator";

export const LESSON_PROGRESS_STATUSES = ["not_started", "in_progress", "completed"] as const;
export type LessonProgressStatus = (typeof LESSON_PROGRESS_STATUSES)[number];

export class UpsertProgressDto {
  @IsString()
  userId!: string;

  @IsString()
  lessonId!: string;

  @IsOptional()
  @IsIn(LESSON_PROGRESS_STATUSES)
  status?: LessonProgressStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  watchedSeconds?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  lastPositionSeconds?: number;
}
