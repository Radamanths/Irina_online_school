import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsOptional, IsString, Length, ValidateNested } from "class-validator";

class SeoLocaleInput {
  @IsString()
  @Length(0, 140)
  title!: string;

  @IsString()
  @Length(0, 320)
  description!: string;

  @IsString()
  keywords!: string;
}

class SeoPageInput {
  @IsString()
  id!: string;

  @IsString()
  label!: string;

  @IsString()
  slug!: string;

  @IsOptional()
  @IsString()
  image?: string;

  @ValidateNested()
  @Type(() => SeoLocaleInput)
  ru!: SeoLocaleInput;

  @ValidateNested()
  @Type(() => SeoLocaleInput)
  en!: SeoLocaleInput;
}

export class UpdateSeoSettingsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SeoPageInput)
  pages!: SeoPageInput[];
}
