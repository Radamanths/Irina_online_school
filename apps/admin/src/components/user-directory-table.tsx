"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { updateUserRolesAction } from "../actions/user-roles";
import type { RoleOption, UserDirectoryRecord } from "../lib/api";
import { DataTable, type DataTableColumn, type DataTableRow } from "./data-table";

interface UserRow extends DataTableRow {
  user: ReactNode;
  roles: ReactNode;
  locale: string;
  timezone: string;
  createdAt: string;
  lastActiveAt: string;
}

interface UserDirectoryTableProps {
  users: UserDirectoryRecord[];
  roleOptions: RoleOption[];
}

type RoleEditorState = {
  userId: string;
  draft: string[];
  status: "idle" | "saving" | "error";
  error?: string;
};

type RoleFlashMessage = {
  userId: string;
  tone: "success" | "error";
  text: string;
};

const columns: DataTableColumn[] = [
  { key: "user", label: "Пользователь" },
  { key: "roles", label: "Роли" },
  { key: "locale", label: "Локаль", align: "center" },
  { key: "timezone", label: "Часовой пояс" },
  { key: "createdAt", label: "Создан", align: "right" },
  { key: "lastActiveAt", label: "Активность", align: "right" }
];

export function UserDirectoryTable({ users, roleOptions }: UserDirectoryTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [tableUsers, setTableUsers] = useState(users);
  const [roleEditor, setRoleEditor] = useState<RoleEditorState | null>(null);
  const [roleFlash, setRoleFlash] = useState<RoleFlashMessage | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setTableUsers(users);
  }, [users]);

  useEffect(() => {
    if (!roleFlash) {
      return;
    }
    const timer = setTimeout(() => {
      setRoleFlash(current => (current?.userId === roleFlash.userId ? null : current));
    }, 2500);
    return () => clearTimeout(timer);
  }, [roleFlash]);

  const resolvedRoleOptions = useMemo(() => {
    const baseOptions = roleOptions.length ? [...roleOptions] : [];
    const knownCodes = new Set(baseOptions.map(option => option.code));
    const extras = new Set<string>();

    tableUsers.forEach(user => {
      user.roleCodes.forEach(code => {
        if (code && !knownCodes.has(code)) {
          extras.add(code);
        }
      });
    });

    const extraOptions = Array.from(extras).map(code => ({ code, name: code }));
    if (baseOptions.length) {
      return extraOptions.length ? [...baseOptions, ...extraOptions] : baseOptions;
    }

    return extraOptions;
  }, [roleOptions, tableUsers]);

  const roleFilterOptions = useMemo(() => {
    const options = resolvedRoleOptions.length
      ? resolvedRoleOptions.map(option => ({ value: option.code, label: option.name }))
      : [];
    return [{ value: "all", label: "Все" }, ...options];
  }, [resolvedRoleOptions]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return tableUsers.filter(user => {
      const matchesRole = roleFilter === "all" || user.roleCodes.includes(roleFilter);
      const haystack = `${user.name} ${user.email}`.toLowerCase();
      const matchesQuery = normalizedQuery ? haystack.includes(normalizedQuery) : true;
      return matchesRole && matchesQuery;
    });
  }, [roleFilter, searchQuery, tableUsers]);

  const rows: UserRow[] = filteredUsers.map(user => {
    const isEditing = roleEditor?.userId === user.id;
    return {
      id: user.id,
      user: (
        <div>
          <strong>{user.name}</strong>
          <p className="table-subtitle">{user.email}</p>
        </div>
      ),
      roles: isEditing ? renderRoleEditor(user) : renderRoleDisplay(user),
      locale: user.locale,
      timezone: user.timezone,
      createdAt: user.createdAt,
      lastActiveAt: user.lastActiveAt
    };
  });

  function renderRoleDisplay(user: UserDirectoryRecord) {
    const hasRoles = user.roles.length > 0;
    const flashMessage = roleFlash?.userId === user.id ? roleFlash : null;

    return (
      <div className="role-display">
        <div className="pill-group" aria-live="polite">
          {hasRoles ? (
            user.roles.map(role => (
              <span key={`${user.id}-${role}`} className="status-pill status-pill--info">
                {role}
              </span>
            ))
          ) : (
            <span className="table-subtitle">Нет ролей</span>
          )}
        </div>
        <button type="button" className="table-inline-button" onClick={() => handleStartEditing(user)}>
          Изменить
        </button>
        {flashMessage && (
          <p className={`table-feedback table-feedback--${flashMessage.tone}`}>{flashMessage.text}</p>
        )}
      </div>
    );
  }

  function renderRoleEditor(user: UserDirectoryRecord) {
    const draft = roleEditor?.draft ?? [];
    const isSaving = roleEditor?.status === "saving" || isPending;
    const disableSave = draft.length === 0 || isSaving;

    return (
      <div className="role-editor">
        <div className="role-editor__options" role="group" aria-label={`Роли для ${user.name}`}>
          {resolvedRoleOptions.map(option => {
            const checked = draft.includes(option.code);
            return (
              <label key={`${user.id}-${option.code}`} className="role-editor__option">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={isSaving}
                  onChange={() => toggleRoleSelection(option.code)}
                />
                {option.name}
              </label>
            );
          })}
        </div>
        <div className="role-editor__actions">
          <button type="button" className="table-inline-button" onClick={handleCancelEdit} disabled={isSaving}>
            Отмена
          </button>
          <button
            type="button"
            className="table-inline-button table-inline-button--primary"
            onClick={handleSaveRoles}
            disabled={disableSave}
          >
            {isSaving ? "Сохраняем..." : "Сохранить"}
          </button>
        </div>
        {roleEditor?.error && <p className="table-feedback table-feedback--error">{roleEditor.error}</p>}
      </div>
    );
  }

  function handleStartEditing(user: UserDirectoryRecord) {
    setRoleEditor({ userId: user.id, draft: user.roleCodes, status: "idle" });
    setRoleFlash(current => (current?.userId === user.id ? null : current));
  }

  function handleCancelEdit() {
    setRoleEditor(null);
  }

  function toggleRoleSelection(roleCode: string) {
    setRoleEditor(current => {
      if (!current) {
        return current;
      }
      const exists = current.draft.includes(roleCode);
      const draft = exists ? current.draft.filter(code => code !== roleCode) : [...current.draft, roleCode];
      return { ...current, draft, status: "idle", error: undefined };
    });
  }

  function handleSaveRoles() {
    if (!roleEditor) {
      return;
    }

    if (roleEditor.draft.length === 0) {
      setRoleEditor(current =>
        current ? { ...current, status: "error", error: "Выберите хотя бы одну роль" } : current
      );
      return;
    }

    const { userId, draft } = roleEditor;
    setRoleEditor(current => (current ? { ...current, status: "saving", error: undefined } : current));

    startTransition(async () => {
      try {
        const updatedUser = await updateUserRolesAction(userId, draft);
        setTableUsers(current => current.map(user => (user.id === updatedUser.id ? updatedUser : user)));
        setRoleEditor(null);
        setRoleFlash({ userId: updatedUser.id, tone: "success", text: "Роли обновлены" });
      } catch (error) {
        console.error(error);
        setRoleEditor(current =>
          current?.userId === userId
            ? { ...current, status: "error", error: "Не удалось обновить роли" }
            : current
        );
      }
    });
  }

  return (
    <div className="table-stack">
      <div className="table-toolbar">
        <div className="table-toolbar__group">
          <label className="table-toolbar__label" htmlFor="user-search">
            Поиск
          </label>
          <input
            id="user-search"
            className="table-toolbar__search"
            placeholder="Имя или email"
            value={searchQuery}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchQuery(event.target.value)}
          />
        </div>
        <label className="table-toolbar__label" htmlFor="user-role-filter">
          Роль
        </label>
        <select
          id="user-role-filter"
          className="table-toolbar__select"
          value={roleFilter}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => setRoleFilter(event.target.value)}
        >
          {roleFilterOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <DataTable columns={columns} rows={rows} caption="Команда и пользователи" />
    </div>
  );
}
