import { EnrollmentStatus } from "@prisma/client";
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateManualEnrollmentDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  courseId!: string;

  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;

  @IsOptional()
  @IsDateString()
  accessStart?: string;

  @IsOptional()
  @IsDateString()
  accessEnd?: string;

  @IsOptional()
  @MaxLength(500)
  note?: string;
}
