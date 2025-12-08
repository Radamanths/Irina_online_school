import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";

export class UpsertBillingProfileDto {
  @IsString()
  userId!: string;

  @IsString()
  @MaxLength(200)
  fullName!: string;

  @IsEmail()
  @MaxLength(200)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  taxId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;
}
