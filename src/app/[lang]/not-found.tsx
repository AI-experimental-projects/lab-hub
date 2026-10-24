import Link from "next/link";
import { localePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";

export default async function NotFound() {
  const { locale, t } = await getDictionary();
  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-sm text-muted">404</p>
      <h1 className="text-2xl font-medium text-fg-strong">{t.notFound.title}</h1>
      <Link href={localePath(locale, "/")} className="text-sm text-accent hover:underline">
        {t.notFound.back}
      </Link>
    </div>
  );
}
