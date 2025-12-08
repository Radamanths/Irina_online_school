import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateProgressAutomationSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  webhookUrl?: string | null;

  @IsBoolean()
  enabled!: boolean;
}
