
import { RegisterForm } from "@/components/RegisterForm";
import { Navbar } from "@/components/Navbar";
import { getCurrentUser } from "@/lib/auth";

export default async function CarrierRegisterPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} />
      <main className="px-4 py-10">
        <RegisterForm role={"CARRIER"} />
      </main>
    </div>
  );
}
