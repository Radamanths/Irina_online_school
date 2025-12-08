import { IsEnum, IsIn, IsOptional, IsString } from "class-validator";
import { PaymentProvider } from "@prisma/client";
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from "../../orders/dto/create-order.dto";
import type { SupportedLocale } from "../../courses/courses.data";

export class CheckoutDto {
  @IsString()
  courseId!: string;

  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  subscriptionPlanId?: string;

  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider;

  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES as readonly string[])
  currency?: SupportedCurrency;

  @IsOptional()
  @IsIn(["ru", "en"])
  locale?: SupportedLocale;
}
