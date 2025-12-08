"use client";

import { useMemo } from "react";
import type { RoleOption, UserDirectoryRecord } from "../lib/api";

interface UserRoleSummaryProps {
  users: UserDirectoryRecord[];
  roleOptions: RoleOption[];
}

interface RoleStat extends RoleOption {
  count: number;
}

export function UserRoleSummary({ users, roleOptions }: UserRoleSummaryProps) {
  const summary = useMemo(() => buildSummary(users, roleOptions), [users, roleOptions]);

  if (!summary.roles.length && summary.unassigned === 0) {
    return null;
  }

  return (
    <section className="role-summary" aria-label="Распределение ролей">
      <header className="role-summary__header">
        <div>
          <p className="eyebrow">Роли</p>
          <h3>Доступы команды</h3>
        </div>
        <p className="role-summary__total">{summary.total} пользователей</p>
      </header>
      <div className="role-summary__grid">
        {summary.roles.map(role => (
          <div key={role.code} className="role-summary__card">
            <p className="role-summary__label">{role.name}</p>
            <p className="role-summary__value">{role.count}</p>
            <p className="role-summary__hint">{formatAccountLabel(role.count)}</p>
          </div>
        ))}
        <div className="role-summary__card role-summary__card--muted">
          <p className="role-summary__label">Без роли</p>
          <p className="role-summary__value">{summary.unassigned}</p>
          <p className="role-summary__hint">{summary.unassigned ? "нужно назначение" : "всё ок"}</p>
        </div>
      </div>
    </section>
  );
}

function buildSummary(users: UserDirectoryRecord[], roleOptions: RoleOption[]) {
  const knownCodes = new Set(roleOptions.map(option => option.code));
  const extraCodes = new Map<string, RoleOption>();

  users.forEach(user => {
    user.roleCodes.forEach(code => {
      if (!knownCodes.has(code) && !extraCodes.has(code)) {
        extraCodes.set(code, { code, name: code });
      }
    });
  });

  const resolvedOptions: RoleOption[] = [...roleOptions, ...extraCodes.values()];
  const roles: RoleStat[] = resolvedOptions.map(option => ({
    ...option,
    count: users.reduce((total, user) => (user.roleCodes.includes(option.code) ? total + 1 : total), 0)
  }));
  const unassigned = users.filter(user => user.roleCodes.length === 0).length;

  return {
    roles,
    total: users.length,
    unassigned
  };
}

function formatAccountLabel(count: number) {
  if (count === 1) {
    return "аккаунт";
  }
  if (count >= 2 && count <= 4) {
    return "аккаунта";
  }
  return "аккаунтов";
}
