import { Transform } from "class-transformer";
import { IsNumber, IsOptional, IsString, Matches, Min } from "class-validator";

const SAFE_FILENAME_REGEX = /^[\w\-. ()]+$/i;

export class RequestMediaUploadDto {
  @IsString()
  @Matches(SAFE_FILENAME_REGEX, { message: "Filename contains invalid characters" })
  filename!: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return value;
  })
  @IsNumber({ allowNaN: false, maxDecimalPlaces: 2 }, { message: "sizeBytes must be a number" })
  @Min(0)
  sizeBytes?: number;
}
