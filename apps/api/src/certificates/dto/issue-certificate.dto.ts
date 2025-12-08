import { IsNotEmpty, IsOptional, IsString, IsUrl } from "class-validator";

export class IssueCertificateDto {
  @IsString()
  @IsNotEmpty()
  enrollmentId!: string;

  @IsUrl()
  pdfUrl!: string;

  @IsOptional()
  @IsString()
  hash?: string;
}
