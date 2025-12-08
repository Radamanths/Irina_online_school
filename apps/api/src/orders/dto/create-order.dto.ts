import { IsEnum, IsIn, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";
import { OrderType, PaymentProvider } from "@prisma/client";

export const SUPPORTED_CURRENCIES = ["USD", "RUB", "KZT"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  courseId!: string;

  @IsOptional()
  @IsString()
  subscriptionPlanId?: string;

  @IsOptional()
  @IsEnum(OrderType)
  type?: OrderType;

  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES as readonly string[])
  currency?: SupportedCurrency;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider;
}
