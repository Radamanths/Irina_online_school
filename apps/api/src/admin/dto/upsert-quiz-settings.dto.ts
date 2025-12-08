import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class UpsertQuizSettingsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  passScore!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  attemptsLimit?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(30)
  timeLimitSeconds?: number | null;
}
