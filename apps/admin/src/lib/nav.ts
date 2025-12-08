export interface NavItem {
  label: string;
  href: string;
  badge?: string;
}

export const primaryNav: NavItem[] = [
  { label: "Дэшборд", href: "/" },
  { label: "Курсы", href: "/courses" },
  { label: "Учебный план", href: "/curriculum" },
  { label: "Медиа", href: "/media", badge: "beta" },
  { label: "SEO", href: "/seo" },
  { label: "Автоматизация", href: "/automation" },
  { label: "Потоки", href: "/cohorts" },
  { label: "Студенты", href: "/students" },
  { label: "Пользователи", href: "/users" },
  { label: "Заказы", href: "/orders" },
  { label: "Платежи", href: "/payments" }
];
