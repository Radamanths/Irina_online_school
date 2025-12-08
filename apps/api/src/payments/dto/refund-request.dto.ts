import { IsOptional, IsString } from "class-validator";

export class RefundRequestDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
