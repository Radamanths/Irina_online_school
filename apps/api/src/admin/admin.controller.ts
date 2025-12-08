import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from "@nestjs/common";
import { AdminService } from "./admin.service";
import type { AdminOrdersFeedResult } from "./admin.service";
import { SaveCourseDraftDto } from "./dto/save-course-draft.dto";
import { UpsertLessonDto } from "./dto/upsert-lesson.dto";
import { ReorderLessonsDto } from "./dto/reorder-lessons.dto";
import { UpdateUserRolesDto } from "./dto/update-user-roles.dto";
import { CreatePaymentLinkDto } from "./dto/create-payment-link.dto";
import { RefundOrderDto } from "./dto/refund-order.dto";
import { RequestMediaUploadDto } from "./dto/request-media-upload.dto";
import { UpdateSeoSettingsDto } from "./dto/update-seo-settings.dto";
import { CreateManualEnrollmentDto } from "./dto/create-manual-enrollment.dto";
import { UpdateEnrollmentDto } from "./dto/update-enrollment.dto";
import { UpdateProgressAutomationSettingsDto } from "./dto/update-progress-automation-settings.dto";
import { UpsertQuizSettingsDto } from "./dto/upsert-quiz-settings.dto";
import { RunDunningDto } from "./dto/run-dunning.dto";
import { UpdateInvoiceDto } from "./dto/update-invoice.dto";

@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("students")
  getStudentDirectory(@Query("limit") limit?: string) {
    const parsedLimit = limit ? Number(limit) : undefined;
    const safeLimit = parsedLimit && parsedLimit > 0 ? Math.min(parsedLimit, 200) : undefined;
    return this.adminService.getStudentDirectory(safeLimit);
  }

  @Get("users")
  getUserDirectory(@Query("limit") limit?: string) {
    const parsedLimit = limit ? Number(limit) : undefined;
    const safeLimit = parsedLimit && parsedLimit > 0 ? Math.min(parsedLimit, 200) : undefined;
    return this.adminService.getUserDirectory(safeLimit);
  }

  @Get("roles")
  getAvailableRoles() {
    return this.adminService.getAvailableRoles();
  }

  @Post("enrollments/manual")
  createManualEnrollment(@Body() dto: CreateManualEnrollmentDto) {
    return this.adminService.createManualEnrollment(dto);
  }

  @Patch("enrollments/:enrollmentId")
  updateManualEnrollment(@Param("enrollmentId") enrollmentId: string, @Body() dto: UpdateEnrollmentDto) {
    return this.adminService.updateManualEnrollment(enrollmentId, dto);
  }

  @Put("users/:userId/roles")
  updateUserRoles(@Param("userId") userId: string, @Body() dto: UpdateUserRolesDto) {
    return this.adminService.updateUserRoles(userId, dto.roles);
  }

  @Get("dashboard")
  getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get("courses")
  getCourses() {
    return this.adminService.getCourseSummaries();
  }

  @Get("courses/:id")
  getCourseDetail(@Param("id") courseId: string) {
    return this.adminService.getCourseDetail(courseId);
  }

  @Post("courses")
  saveCourseDraft(@Body() dto: SaveCourseDraftDto) {
    return this.adminService.saveCourseDraft(dto);
  }

  @Get("cohorts")
  getCohorts() {
    return this.adminService.getCohortSummaries();
  }

  @Get("modules")
  getModules() {
    return this.adminService.getModuleDirectory();
  }

  @Get("modules/:moduleId/lessons")
  getModuleLessons(@Param("moduleId") moduleId: string) {
    return this.adminService.getModuleLessons(moduleId);
  }

  @Post("modules/:moduleId/lessons")
  createLesson(@Param("moduleId") moduleId: string, @Body() dto: UpsertLessonDto) {
    return this.adminService.createLesson(moduleId, dto);
  }

  @Put("modules/:moduleId/lessons/:lessonId")
  updateLesson(
    @Param("moduleId") moduleId: string,
    @Param("lessonId") lessonId: string,
    @Body() dto: UpsertLessonDto
  ) {
    return this.adminService.updateLesson(moduleId, lessonId, dto);
  }

  @Delete("modules/:moduleId/lessons/:lessonId")
  deleteLesson(@Param("moduleId") moduleId: string, @Param("lessonId") lessonId: string) {
    return this.adminService.deleteLesson(moduleId, lessonId);
  }

  @Patch("modules/:moduleId/lessons/order")
  reorderLessons(@Param("moduleId") moduleId: string, @Body() dto: ReorderLessonsDto) {
    return this.adminService.reorderLessons(moduleId, dto.lessonIds);
  }

  @Get("lessons/:lessonId/quiz")
  getLessonQuiz(@Param("lessonId") lessonId: string) {
    return this.adminService.getLessonQuizSettings(lessonId);
  }

  @Put("lessons/:lessonId/quiz")
  upsertLessonQuiz(@Param("lessonId") lessonId: string, @Body() dto: UpsertQuizSettingsDto) {
    return this.adminService.upsertLessonQuizSettings(lessonId, dto);
  }

  @Get("orders")
  getOrders(
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Query("status") status?: string,
    @Query("paymentStatus") paymentStatus?: string,
    @Query("method") method?: string,
    @Query("currency") currency?: string,
    @Query("courseId") courseId?: string,
    @Query("courseSlug") courseSlug?: string,
    @Query("cohortCode") cohortCode?: string,
    @Query("from") createdFrom?: string,
    @Query("to") createdTo?: string,
    @Query("q") search?: string
  ): Promise<AdminOrdersFeedResult> {
    const parsedLimit = limit ? Number(limit) : undefined;
    const take = parsedLimit && parsedLimit > 0 ? Math.min(parsedLimit, 200) : undefined;
    const parsedOffset = offset ? Number(offset) : undefined;
    const skip = parsedOffset && parsedOffset > 0 ? Math.max(parsedOffset, 0) : undefined;
    return this.adminService.getOrdersFeed({
      limit: take,
      offset: skip,
      status,
      paymentStatus,
      method,
      currency,
      courseId,
      courseSlug,
      cohortCode,
      createdFrom,
      createdTo,
      search
    });
  }

  @Get("orders/:id")
  getOrderDetail(@Param("id") orderId: string) {
    return this.adminService.getOrderDetail(orderId);
  }

  @Post("orders/:id/remind")
  sendOrderReminder(@Param("id") orderId: string) {
    return this.adminService.sendOrderPaymentReminder(orderId);
  }

  @Post("orders/:id/refund")
  refundOrder(@Param("id") orderId: string, @Body() dto: RefundOrderDto) {
    return this.adminService.refundOrder(orderId, dto);
  }

  @Post("orders/:id/payment-link")
  createPaymentLink(@Param("id") orderId: string, @Body() dto: CreatePaymentLinkDto) {
    return this.adminService.createPaymentLink(orderId, dto);
  }

  @Patch("orders/:id/invoice")
  updateOrderInvoice(@Param("id") orderId: string, @Body() dto: UpdateInvoiceDto) {
    return this.adminService.updateOrderInvoice(orderId, dto);
  }

  @Get("media/assets")
  getMediaAssets(@Query("limit") limit?: string) {
    const parsedLimit = limit ? Number(limit) : undefined;
    const safeLimit = parsedLimit && parsedLimit > 0 ? Math.min(parsedLimit, 100) : undefined;
    return this.adminService.getMediaLibrary(safeLimit);
  }

  @Post("media/uploads")
  requestMediaUpload(@Body() dto: RequestMediaUploadDto) {
    return this.adminService.requestMediaUpload(dto);
  }

  @Get("seo")
  getSeoSettings() {
    return this.adminService.getSeoSettings();
  }

  @Put("seo")
  updateSeoSettings(@Body() dto: UpdateSeoSettingsDto) {
    return this.adminService.updateSeoSettings(dto);
  }

  @Get("automation/progress")
  getProgressAutomationSettings() {
    return this.adminService.getProgressAutomationSettings();
  }

  @Put("automation/progress")
  updateProgressAutomationSettings(@Body() dto: UpdateProgressAutomationSettingsDto) {
    return this.adminService.updateProgressAutomationSettings(dto);
  }

  @Post("automation/progress/test")
  triggerProgressAutomationTest() {
    return this.adminService.triggerProgressAutomationTest();
  }

  @Post("automation/dunning/run")
  triggerDunningAutomation(@Body() dto: RunDunningDto) {
    return this.adminService.triggerDunningRun(dto);
  }
}
