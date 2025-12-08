"use client";

import { useMemo, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { Button } from "@virgo/ui";
import type { CourseSummary, ManualEnrollmentInput, UserDirectoryRecord } from "../lib/api";
import { createManualEnrollmentAction, type ManualEnrollmentActionResult } from "../actions/enrollments";

interface ManualEnrollmentFormProps {
  users: UserDirectoryRecord[];
  courses: CourseSummary[];
}

interface FormStatus {
  status: "idle" | ManualEnrollmentActionResult["status"];
  message?: string;
}

export function ManualEnrollmentForm({ users, courses }: ManualEnrollmentFormProps) {
  const [status, setStatus] = useState<FormStatus>({ status: "idle" });
  const [isPending, startTransition] = useTransition();

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.name.localeCompare(b.name, "ru")),
    [users]
  );
  const sortedCourses = useMemo(
    () => [...courses].sort((a, b) => a.title.localeCompare(b.title, "ru")),
    [courses]
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const statusValue = (formData.get("status") || "").toString() as ManualEnrollmentInput["status"];
    const payload: ManualEnrollmentInput = {
      userId: (formData.get("userId") || "").toString(),
      courseId: (formData.get("courseId") || "").toString(),
      status: statusValue || undefined,
      accessStart: normalizeDateValue(formData.get("accessStart")),
      accessEnd: normalizeDateValue(formData.get("accessEnd")),
      note: (formData.get("note") || "").toString().trim() || undefined
    };

    if (!payload.userId || !payload.courseId) {
      setStatus({ status: "error", message: "Выберите студента и курс" });
      return;
    }

    startTransition(async () => {
      const result = await createManualEnrollmentAction(payload);
      setStatus(result);
      if (result.status === "success") {
        form.reset();
      }
    });
  };

  return (
    <section id="manual-enrollment" className="form-panel" aria-live="polite">
      <header>
        <p className="eyebrow">Ручная выдача</p>
        <h2>Добавить студента на курс</h2>
        <p>Выдайте доступ к курсу без оплаты — укажите студента, программу и даты доступа.</p>
      </header>
      <form className="form-section" onSubmit={handleSubmit}>
        <div className="field-grid">
          <label className="form-field">
            <span>Студент</span>
            <select name="userId" defaultValue="">
              <option value="" disabled>
                Выберите студента
              </option>
              {sortedUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} · {user.email}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Курс</span>
            <select name="courseId" defaultValue="">
              <option value="" disabled>
                Выберите курс
              </option>
              {sortedCourses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.title} ({course.cohort})
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Статус</span>
            <select name="status" defaultValue="active">
              <option value="active">Активен</option>
              <option value="paused">Пауза</option>
              <option value="completed">Завершён</option>
            </select>
          </label>
          <label className="form-field">
            <span>Начало доступа</span>
            <input type="date" name="accessStart" />
          </label>
          <label className="form-field">
            <span>Окончание доступа</span>
            <input type="date" name="accessEnd" />
          </label>
        </div>
        <label className="form-field">
          <span>Комментарий</span>
          <textarea name="note" rows={3} placeholder="Например, причина выдачи доступа" />
        </label>
        {status.status === "error" && status.message && <p className="form-error">{status.message}</p>}
        {status.status === "success" && (
          <p className="form-success">{status.message ?? "Доступ выдан"}</p>
        )}
        <div className="form-actions">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Сохраняем..." : "Выдать доступ"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function normalizeDateValue(value: FormDataEntryValue | null): string | undefined {
  if (!value) {
    return undefined;
  }
  const raw = value.toString().trim();
  if (!raw) {
    return undefined;
  }
  const date = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toISOString();
}
