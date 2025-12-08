import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpsertBillingProfileDto } from "./dto/upsert-billing-profile.dto";
import { RequestInvoiceDto } from "./dto/request-invoice.dto";

export interface BillingProfileResponse {
  userId: string;
  fullName: string;
  email: string;
  companyName?: string | null;
  taxId?: string | null;
  address?: string | null;
  phone?: string | null;
  updatedAt: Date;
}

export interface InvoiceRequestSummary {
  id: string;
  status: InvoiceStatusValue;
  downloadUrl?: string | null;
  notes?: string | null;
  requestedAt: Date;
}

type BillingProfileRecord = {
  id?: string;
  userId: string;
  fullName: string;
  email: string;
  companyName?: string | null;
  taxId?: string | null;
  address?: string | null;
  phone?: string | null;
  metadata?: unknown;
  createdAt?: Date;
  updatedAt?: Date;
};

type BillingProfileDbRecord = BillingProfileRecord & { id: string; updatedAt: Date };

type OrderInvoiceRecord = {
  id?: string;
  orderId: string;
  userId: string;
  status: InvoiceStatusValue;
  downloadUrl?: string | null;
  profileSnapshot: Record<string, unknown>;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type OrderInvoiceDbRecord = OrderInvoiceRecord & { id: string; createdAt: Date; updatedAt: Date };

type BillingProfileDelegate = {
  findUnique: (args: { where: { userId?: string; id?: string } }) => Promise<BillingProfileDbRecord | null>;
  upsert: (args: {
    where: { userId: string };
    update: Partial<BillingProfileRecord>;
    create: BillingProfileRecord;
  }) => Promise<BillingProfileDbRecord>;
};

type OrderInvoiceDelegate = {
  upsert: (args: {
    where: { orderId: string };
    update: Partial<OrderInvoiceRecord>;
    create: OrderInvoiceRecord;
  }) => Promise<OrderInvoiceDbRecord>;
};

type OrderDelegate = {
  findUnique: (args: { where: { id: string }; include?: { invoice?: boolean } }) => Promise<
    | ({ id: string; userId: string; invoice?: OrderInvoiceDbRecord | null } & Record<string, unknown>)
    | null
  >;
};

type InvoiceStatusValue = "pending" | "issued" | "failed";

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<BillingProfileResponse | null> {
    const profile = await this.getBillingProfileDelegate().findUnique({ where: { userId } });
    return profile ? this.mapProfile(profile) : null;
  }

  async upsertProfile(dto: UpsertBillingProfileDto): Promise<BillingProfileResponse> {
    const userExists = await this.prisma.user.findUnique({ where: { id: dto.userId }, select: { id: true } });
    if (!userExists) {
      throw new NotFoundException(`User ${dto.userId} not found`);
    }

    const profile = await this.getBillingProfileDelegate().upsert({
      where: { userId: dto.userId },
      update: {
        fullName: dto.fullName,
        email: dto.email,
        companyName: dto.companyName ?? null,
        taxId: dto.taxId ?? null,
        address: dto.address ?? null,
        phone: dto.phone ?? null
      },
      create: {
        userId: dto.userId,
        fullName: dto.fullName,
        email: dto.email,
        companyName: dto.companyName ?? null,
        taxId: dto.taxId ?? null,
        address: dto.address ?? null,
        phone: dto.phone ?? null
      }
    });

    return this.mapProfile(profile);
  }

  async requestInvoice(orderId: string, dto: RequestInvoiceDto): Promise<InvoiceRequestSummary> {
    const order = await this.getOrderDelegate().findUnique({
      where: { id: orderId },
      include: { invoice: true }
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.userId !== dto.userId) {
      throw new ForbiddenException("You can only request invoices for your own orders");
    }

    const profile = await this.getBillingProfileDelegate().findUnique({ where: { userId: dto.userId } });
    if (!profile) {
      throw new BadRequestException("Billing profile is required before requesting an invoice");
    }

    const recorded = await this.getOrderInvoiceDelegate().upsert({
      where: { orderId },
      update: {
        profileSnapshot: this.buildProfileSnapshot(profile),
        status: "pending",
        downloadUrl: null,
        notes: dto.notes ?? null
      },
      create: {
        orderId,
        userId: dto.userId,
        profileSnapshot: this.buildProfileSnapshot(profile),
        status: "pending",
        downloadUrl: null,
        notes: dto.notes ?? null
      }
    });

    return this.mapInvoice(recorded);
  }

  private mapProfile(profile: BillingProfileDbRecord): BillingProfileResponse {
    return {
      userId: profile.userId,
      fullName: profile.fullName,
      email: profile.email,
      companyName: profile.companyName ?? null,
      taxId: profile.taxId ?? null,
      address: profile.address ?? null,
      phone: profile.phone ?? null,
      updatedAt: profile.updatedAt
    };
  }

  private mapInvoice(invoice: OrderInvoiceDbRecord): InvoiceRequestSummary {
    return {
      id: invoice.id,
      status: invoice.status,
      downloadUrl: invoice.downloadUrl ?? null,
      notes: invoice.notes ?? null,
      requestedAt: invoice.createdAt
    };
  }

  private buildProfileSnapshot(profile: BillingProfileRecord): Record<string, unknown> {
    return {
      userId: profile.userId,
      fullName: profile.fullName,
      email: profile.email,
      companyName: profile.companyName ?? null,
      taxId: profile.taxId ?? null,
      address: profile.address ?? null,
      phone: profile.phone ?? null,
      recordedAt: new Date().toISOString()
    };
  }

  private getBillingProfileDelegate(): BillingProfileDelegate {
    const delegate = (this.prisma as PrismaService & { billingProfile?: BillingProfileDelegate }).billingProfile;
    if (!delegate) {
      throw new Error("Prisma billingProfile delegate is not available. Run prisma generate.");
    }
    return delegate;
  }

  private getOrderInvoiceDelegate(): OrderInvoiceDelegate {
    const delegate = (this.prisma as PrismaService & { orderInvoice?: OrderInvoiceDelegate }).orderInvoice;
    if (!delegate) {
      throw new Error("Prisma orderInvoice delegate is not available. Run prisma generate.");
    }
    return delegate;
  }

  private getOrderDelegate(): OrderDelegate {
    const delegate = (this.prisma as PrismaService & { order?: OrderDelegate }).order;
    if (!delegate) {
      throw new Error("Prisma order delegate is not available. Run prisma generate.");
    }
    return delegate;
  }
}
