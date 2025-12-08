"use client";
import { createContext, ReactNode, useContext } from "react";

const LocaleContext = createContext("ru");

export function LocaleProvider({ locale, children }: { locale: string; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
