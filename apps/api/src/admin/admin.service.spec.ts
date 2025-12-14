import { AdminService } from "./admin.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { PaymentsService } from "../payments/payments.service";
import type { ProgressWebhookService } from "../progress/progress-webhook.service";
import { createPrismaMock } from "../../test/prisma.mock";

describe("AdminService — getOrdersFeed", () => {
  let service: AdminService;

  beforeEach(() => {
    const prismaMock = createPrismaMock() as unknown as PrismaService;
    const paymentsStub = {
      createPaymentLinkForOrder: jest.fn()
    } as unknown as PaymentsService;

    const progressWebhookStub = {} as unknown as ProgressWebhookService;

    service = new AdminService(prismaMock, paymentsStub, progressWebhookStub);
  });

  it("returns paginated metadata", async () => {
    const result = await service.getOrdersFeed({ limit: 1, offset: 1 });
    expect(result.limit).toBe(1);
    expect(result.offset).toBe(1);
    expect(result.total).toBeGreaterThan(1);
    expect(result.items).toHaveLength(1);
    expect(typeof result.hasMore).toBe("boolean");
    expect(result.facets.currencies.length).toBeGreaterThan(0);
  });

  it("filters by status, payment state, and method", async () => {
    const result = await service.getOrdersFeed({ status: "completed", paymentStatus: "paid", method: "stripe" });
    expect(result.total).toBeGreaterThan(0);
    result.items.forEach(order => {
      expect(order.status).toBe("completed");
      expect(order.paymentStatus).toBe("paid");
      expect(order.method).toBe("Stripe");
    });
  });

  it("applies search queries across ids and user data", async () => {
    const result = await service.getOrdersFeed({ search: "анна" });
    expect(result.total).toBeGreaterThan(0);
    result.items.forEach(order => {
      expect(order.student.toLowerCase()).toContain("анна");
    });
    expect(result.facets.methods.length).toBeGreaterThan(0);
  });

  it("filters by course slug, currency, and date window", async () => {
    const result = await service.getOrdersFeed({
      courseSlug: "intro-design",
      currency: "usd",
      createdFrom: "2025-01-01T09:00:00.000Z",
      createdTo: "2025-01-01T11:00:00.000Z"
    });

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      cohort: "INTRO-DESIGN",
      currency: "USD"
    });
  });
});
