import { IsIn, IsOptional } from "class-validator";
import type { PaymentProvider } from "@prisma/client";

const paymentProviders = ["manual", "stripe", "yookassa", "cloudpayments"] as const;
const locales = ["ru", "en"] as const;

export class CreatePaymentLinkDto {
  @IsOptional()
  @IsIn(paymentProviders)
  provider?: PaymentProvider;

  @IsOptional()
  @IsIn(locales)
  locale?: (typeof locales)[number];
}
