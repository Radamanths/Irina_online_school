"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { primaryNav } from "../lib/nav";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div>
        <p className="eyebrow">Virgo Admin</p>
        <h2>Операционная панель</h2>
      </div>
      <nav aria-label="Primary">
        <ul>
          {primaryNav.map(item => {
            const isRoot = item.href === "/";
            const isActive = isRoot
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="sidebar__link"
                  aria-current={isActive ? "page" : undefined}
                >
                  <span>{item.label}</span>
                  {item.badge && <span className="sidebar__badge">{item.badge}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
