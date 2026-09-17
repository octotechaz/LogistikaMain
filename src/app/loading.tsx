"use client";

import { PublicPage } from "@/components/classifieds/shared";

export default function Loading() {
  return (
    <PublicPage emphasizeBackground>
      <div className="mx-auto w-full max-w-[1780px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-5">
            <div className="h-10 w-56 animate-pulse rounded-xl bg-slate-200" />
            <div className="h-[220px] animate-pulse rounded-[24px] border border-slate-200 bg-white" />
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-[20px] border border-slate-200 bg-white"
                >
                  <div className="aspect-[1/0.82] animate-pulse bg-slate-200" />
                  <div className="space-y-3 p-4">
                    <div className="h-5 w-28 animate-pulse rounded bg-slate-200" />
                    <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-5">
            <div className="h-[220px] animate-pulse rounded-[24px] border border-slate-200 bg-white" />
            <div className="h-[260px] animate-pulse rounded-[24px] border border-slate-200 bg-white" />
          </div>
        </div>
      </div>
    </PublicPage>
  );
}
