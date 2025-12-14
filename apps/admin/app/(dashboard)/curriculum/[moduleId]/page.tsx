import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@virgo/ui";
import { PageHeader } from "../../../../src/components/page-header";
import { LessonManager } from "../../../../src/components/lesson-manager";
import { getModuleDirectory, getModuleLessons } from "../../../../src/lib/api";

interface ModuleLessonsPageProps {
  params: Promise<{ moduleId: string }>;
}

export default async function ModuleLessonsPage({ params }: ModuleLessonsPageProps) {
  const { moduleId } = await params;
  const [modules, lessons] = await Promise.all([getModuleDirectory(), getModuleLessons(moduleId)]);
  const moduleMeta = modules.find(module => module.id === moduleId);

  if (!moduleMeta) {
    notFound();
  }

  return (
    <>
      <PageHeader
        eyebrow="Учебный план"
        title={`Уроки: ${moduleMeta.moduleTitle}`}
        description={`Управляйте уроками модуля внутри курса ${moduleMeta.courseTitle}.`}
        actions={
          <Link href="/curriculum">
            <Button variant="ghost">Назад к модулям</Button>
          </Link>
        }
      />
      <LessonManager moduleMeta={moduleMeta} initialLessons={lessons} />
    </>
  );
}
