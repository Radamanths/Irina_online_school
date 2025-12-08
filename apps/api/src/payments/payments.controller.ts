import { Body, Controller, Get, Headers, Param, Post, Query } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { CheckoutDto } from "./dto/checkout.dto";
import { RefundRequestDto } from "./dto/refund-request.dto";
import { ProcessDunningDto } from "./dto/process-dunning.dto";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post("checkout")
  createCheckout(@Body() dto: CheckoutDto) {
    return this.paymentsService.createCheckoutSession(dto);
  }

  @Get("admin/feed")
  getAdminFeed(@Query("limit") limit?: string) {
    const parsedLimit = limit ? Number(limit) : undefined;
    const safeLimit = parsedLimit && parsedLimit > 0 ? Math.min(parsedLimit, 100) : undefined;
    return this.paymentsService.getAdminPaymentFeed(safeLimit);
  }

  @Post("webhooks/stripe")
  async handleStripeWebhook(@Body() payload: unknown, @Headers("stripe-signature") signature?: string) {
    await this.paymentsService.processStripeWebhook(payload, signature);
    return { received: true };
  }

  @Post("webhooks/yookassa")
  async handleYooKassaWebhook(@Body() payload: unknown) {
    await this.paymentsService.processYooKassaWebhook(payload);
    return { received: true };
  }

  @Post("dunning/run")
  async triggerDunning(@Body() dto: ProcessDunningDto) {
    return this.paymentsService.processDunningReminders(dto);
  }

  @Post(":paymentId/refund")
  async requestRefund(@Param("paymentId") paymentId: string, @Body() dto: RefundRequestDto) {
    return this.paymentsService.requestRefund(paymentId, dto);
  }
}
