import { createElement } from "react";
import type { HTMLAttributes } from "react";
import clsx from "clsx";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: "article" | "section" | "div";
}

export function Card({ as = "article", className, ...rest }: CardProps) {
  return createElement(as, {
    className: clsx("card", className),
    ...rest
  });
}
