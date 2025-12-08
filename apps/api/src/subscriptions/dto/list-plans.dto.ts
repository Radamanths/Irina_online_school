import { IsBooleanString, IsOptional, IsString } from "class-validator";

export class ListPlansDto {
  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsBooleanString()
  active?: string;

  @IsOptional()
  @IsString()
  cohortCode?: string;
}
