import {
  ClipboardList,
  Gauge,
  LayoutDashboard,
  PackagePlus,
  ShieldCheck,
  Truck,
  UserRound,
  Users
} from "lucide-react";
import type { Role } from "@prisma/client";
import { FastLink as Link } from "@/components/ui/FastLink";
import { cn } from "@/lib/utils";

const linksByRole = {
  CARRIER: [
    { href: "/carrier/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/carrier/cargo-posts", label: "Aktiv yüklər", icon: PackagePlus },
    { href: "/carrier/applications", label: "Müraciətlərim", icon: ClipboardList },
    { href: "/carrier/vehicles", label: "Avtomobillər", icon: Truck }
  ],
  CARGO_OWNER: [
    { href: "/cargo-owner/dashboard", label: "Mənim elanlarım", icon: LayoutDashboard },
    { href: "/cargo-owner/cargo-posts/new", label: "Yeni elan", icon: ClipboardList }
  ],
  DRIVER: [{ href: "/driver/profile", label: "Profil", icon: UserRound }],
  DISPATCHER: [{ href: "/dispatcher/profile", label: "Profil", icon: UserRound }],
  OPERATOR: [
    { href: "/operator/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/operator/loads", label: "Yüklər", icon: ClipboardList },
    { href: "/operator/drivers", label: "Sürücülər", icon: Truck },
    { href: "/operator/dispatchers", label: "Dispetçerlər", icon: Users }
  ],
  ADMIN: [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "İstifadəçilər", icon: Users },
    { href: "/admin/loads", label: "Yüklər", icon: ShieldCheck },
    { href: "/admin/operators", label: "Operatorlar", icon: UserRound },
    { href: "/admin/statistics", label: "Statistika", icon: Gauge }
  ]
} satisfies Record<Role, Array<{ href: string; label: string; icon: typeof LayoutDashboard }>>;

export function Sidebar({ role, currentPath }: { role: Role; currentPath?: string }) {
  const links = linksByRole[role];

  return (
    <aside className="w-full shrink-0 self-stretch border-b border-navy-100 bg-white lg:w-72 lg:border-b-0 lg:border-r">
      <div className="flex h-full gap-2 overflow-x-auto p-3 lg:sticky lg:top-16 lg:block lg:min-h-[calc(100vh-4rem)] lg:space-y-2 lg:overflow-visible lg:p-4">
        {links.map((item) => {
          const Icon = item.icon;
          const active = currentPath === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex shrink-0 items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition active:opacity-70",
                active ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-navy-50 hover:text-navy-900"
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
