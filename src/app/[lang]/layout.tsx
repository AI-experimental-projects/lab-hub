import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { LanguageSwitch } from "@/components/language-switch";
import { LOCALES, localePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { alternatesFor, SITE_URL } from "@/lib/site";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getDictionary();
  return {
    metadataBase: new URL(SITE_URL),
    title: "Lab Hub",
    description: t.meta.description,
    alternates: alternatesFor(locale, "/"),
    openGraph: {
      siteName: "Lab Hub",
      type: "website",
      locale: locale === "es" ? "es_MX" : "en_US",
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const { locale, t } = await getDictionary();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <header className="border-b border-line">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <Link href={localePath(locale, "/")} className="font-mono text-sm text-fg-strong">
              lab<span className="text-accent">/</span>hub
            </Link>
            <nav className="flex items-center gap-5 text-sm text-muted">
              <Link href={localePath(locale, "/")} className="hover:text-fg-strong">
                {t.nav.projects}
              </Link>
              <Link href={localePath(locale, "/journal")} className="hover:text-fg-strong">
                {t.nav.journal}
              </Link>
              <LanguageSwitch locale={locale} label={t.nav.switchTo} title={t.nav.switchLabel} />
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
