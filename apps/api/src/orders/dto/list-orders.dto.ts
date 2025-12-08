import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsPositive, IsString } from "class-validator";
import { OrderStatus } from "@prisma/client";

export class ListOrdersDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @IsPositive()
  take?: number;
}
