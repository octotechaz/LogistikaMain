import { Suspense } from "react";
import { LoginPageClient } from "@/components/classifieds/LoginPageClient";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <LoginPageClient />
    </Suspense>
  );
}
