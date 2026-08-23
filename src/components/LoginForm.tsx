"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? "")
      })
    });
    const result = await response.json();

    setIsLoading(false);

    if (!response.ok || !result.ok) {
      setError(result.message ?? "Giriş alınmadı.");
      return;
    }

    const { redirectAfterToast } = await import("@/lib/toast");
    redirectAfterToast("Giriş uğurlu oldu. Yönləndirilir...", result.data.redirectTo || "/", 2500);
  }

  return (
    <form onSubmit={onSubmit} className="form-card">
      <div>
        <p className="text-sm font-semibold text-logistics-orange">Təhlükəsiz giriş</p>
        <h1 className="mt-2 text-2xl font-bold text-navy-900">Hesabınıza daxil olun</h1>
        <p className="mt-2 text-sm text-slate-600">Email və ya telefon nömrəsi ilə giriş edin.</p>
      </div>

      {error ? <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <label className="form-label">
        Email və ya telefon
        <input name="email" type="text" className="form-field" placeholder="email@example.com və ya +994..." required />
      </label>

      <label className="form-label">
        Şifrə
        <input name="password" type="password" className="form-field" placeholder="Şifrəniz" required />
      </label>

      <div className="-mt-2 flex items-center justify-end">
        <Link
          href="/auth/forgot-password"
          className="text-sm font-semibold text-logistics-orange transition hover:text-orange-600"
        >
          Şifrəni unutmusan?
        </Link>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Yoxlanılır..." : "Giriş et"}
      </Button>

      <div className="text-center text-sm text-slate-600">
        Hesabın yoxdur?{" "}
        <Link href="/auth/register" className="font-semibold text-logistics-orange transition hover:text-orange-600">
          Qeydiyyatdan keç
        </Link>
      </div>
    </form>
  );
}
