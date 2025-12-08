import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { BillingService } from "./billing.service";
import { UpsertBillingProfileDto } from "./dto/upsert-billing-profile.dto";
import { RequestInvoiceDto } from "./dto/request-invoice.dto";

@Controller("billing")
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get("profile/:userId")
  getProfile(@Param("userId") userId: string) {
    return this.billingService.getProfile(userId);
  }

  @Post("profile")
  upsertProfile(@Body() dto: UpsertBillingProfileDto) {
    return this.billingService.upsertProfile(dto);
  }

  @Post("orders/:orderId/invoice")
  requestInvoice(@Param("orderId") orderId: string, @Body() dto: RequestInvoiceDto) {
    return this.billingService.requestInvoice(orderId, dto);
  }
}
