import { Button } from "@virgo/ui";
import { getCourseSummaries, getStudentDirectory, getUserDirectory } from "../../../src/lib/api";
import { PageHeader } from "../../../src/components/page-header";
import { StudentDirectoryTable } from "../../../src/components/student-directory-table";
import { ManualEnrollmentForm } from "../../../src/components/manual-enrollment-form";

export default async function StudentsPage() {
  const [students, users, courses] = await Promise.all([
    getStudentDirectory(),
    getUserDirectory(),
    getCourseSummaries()
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Студенты"
        title="Состояние групп"
        description="Отслеживайте прогресс и платежный статус по каждому студенту."
        actions={
          <>
            <Button variant="ghost">Импорт CSV</Button>
            <a className="button" href="#manual-enrollment">
              Выдать доступ
            </a>
          </>
        }
      />
      <ManualEnrollmentForm users={users} courses={courses} />
      <StudentDirectoryTable students={students} />
    </>
  );
}
