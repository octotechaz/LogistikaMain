import { LoginForm } from "@/components/LoginForm";
import { Navbar } from "@/components/Navbar";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} />
      <main className="px-4 py-10">
        <LoginForm />
      </main>
    </div>
  );
}
