import { EnrollmentStatus } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, MaxLength } from "class-validator";

export class UpdateEnrollmentDto {
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
