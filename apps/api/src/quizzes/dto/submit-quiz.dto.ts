import { ArrayNotEmpty, IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class QuizAnswerDto {
  @IsString()
  questionId!: string;

  @IsArray()
  @IsString({ each: true })
  selectedOptionIds!: string[];
}

export class SubmitQuizAttemptDto {
  @IsString()
  userId!: string;

  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers!: QuizAnswerDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  elapsedSeconds?: number;
}
