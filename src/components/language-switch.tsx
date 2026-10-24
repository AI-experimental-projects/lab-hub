"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";

// Same page in the other language: /projects/x <-> /es/projects/x.
export function LanguageSwitch({ locale, label, title }: { locale: Locale; label: string; title: string }) {
  // On the server this is the rewritten path (/en/...), in the browser the visible one.
  const bare = usePathname().replace(/^\/(en|es)(?=\/|$)/, "") || "/";
  const target = locale === "es" ? bare : `/es${bare === "/" ? "" : bare}`;

  return (
    <Link
      href={target}
      hrefLang={locale === "es" ? "en" : "es"}
      title={title}
      className="rounded border border-line px-2 py-0.5 text-xs hover:border-accent hover:text-fg-strong"
    >
      {label}
    </Link>
  );
}
