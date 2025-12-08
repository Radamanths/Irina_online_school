import type { Module } from "../lib/types";

export function LessonList({ modules, locale }: { modules: Module[]; locale: string }) {
  return (
    <ol className="module-list">
      {modules.map(module => (
        <li key={module.id}>
          <details open>
            <summary>
              <span>{module.title}</span>
              <span>{module.duration}</span>
            </summary>
            <ul>
              {module.lessons.map(lesson => (
                <li key={lesson.id}>
                  <p>{lesson.title}</p>
                  <small>
                    {lesson.type} · {lesson.length}
                  </small>
                </li>
              ))}
            </ul>
          </details>
        </li>
      ))}
    </ol>
  );
}
