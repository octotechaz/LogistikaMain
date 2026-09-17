"use client";

import { CheckCircle2 } from "lucide-react";
import { PageSection, PublicPage } from "@/components/classifieds/shared";
import { cn } from "@/lib/utils";

export function StaticPageShell({
  title,
  description,
  eyebrow,
  children
}: {
  title: string;
  description: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <PublicPage emphasizeBackground>
      <section className="mx-auto w-full max-w-[1160px] px-4 py-8 sm:px-6 lg:px-8">
        <PageSection eyebrow={eyebrow} title={title} description={description} />
        <div className="mt-8 space-y-6">{children}</div>
      </section>
    </PublicPage>
  );
}

export function StaticContentCard({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={cn("surface-panel p-6 sm:p-8", className)}>{children}</section>;
}

export function StaticParagraphs({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="space-y-4 text-[1rem] leading-8 text-slate-600">
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
  );
}

export function StaticBulletList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-3 text-[0.98rem] text-slate-700 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 rounded-[16px] border border-slate-200 bg-slate-50/70 px-4 py-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-logistics-orange" />
          <span className="leading-7">{item}</span>
        </li>
      ))}
    </ul>
  );
}
