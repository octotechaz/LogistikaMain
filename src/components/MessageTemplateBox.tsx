"use client";

import { Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function MessageTemplateBox({ title, message }: { title: string; message: string }) {
  const [copied, setCopied] = useState(false);

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-lg border border-navy-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-bold text-navy-900">{title}</h4>
        <Button type="button" variant="secondary" onClick={copyMessage} className="min-h-9 px-3">
          <Copy className="h-4 w-4" aria-hidden />
          {copied ? "Kopyalandı" : "Kopyala"}
        </Button>
      </div>
      <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">{message}</pre>
    </div>
  );
}
