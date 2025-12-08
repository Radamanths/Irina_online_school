import { IsOptional, IsString, MaxLength } from "class-validator";

export class RequestInvoiceDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
