import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { CoursesModule } from "./courses/courses.module";
import { UsersModule } from "./users/users.module";
import { PaymentsModule } from "./payments/payments.module";
import { PrismaModule } from "./prisma/prisma.module";
import { TranslationsModule } from "./translations/translations.module";
import { ProgressModule } from "./progress/progress.module";
import { ModulesModule } from "./modules/modules.module";
import { LessonsModule } from "./lessons/lessons.module";
import { CertificatesModule } from "./certificates/certificates.module";
import { OrdersModule } from "./orders/orders.module";
import { QuizzesModule } from "./quizzes/quizzes.module";
import { AdminModule } from "./admin/admin.module";
import { MonitoringModule } from "./monitoring/monitoring.module";
import { EnrollmentsModule } from "./enrollments/enrollments.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { BillingModule } from "./billing/billing.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CoursesModule,
    UsersModule,
    PaymentsModule,
    TranslationsModule,
    ProgressModule,
    ModulesModule,
    LessonsModule,
    CertificatesModule,
    OrdersModule,
    QuizzesModule,
    AdminModule,
    MonitoringModule,
    EnrollmentsModule,
    SubscriptionsModule,
    BillingModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
