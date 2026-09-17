export type TopbarNavItem = {
  id: string;
  href: string;
  label: string;
  activeOn?: string[];
};

export const topbarNavItems: TopbarNavItem[] = [
  { id: "loads", href: "/", label: "Elanlar", activeOn: ["/", "/loads"] },
  { id: "about", href: "/haqqimizda", label: "Platforma haqqında", activeOn: ["/haqqimizda"] },
  { id: "help", href: "/how-it-works", label: "Necə işləyir", activeOn: ["/how-it-works"] }
];

export const footerNavItems: TopbarNavItem[] = [
  { id: "about", href: "/haqqimizda", label: "Platforma haqqında" },
  { id: "terms", href: "/istifade-sertleri", label: "İstifadə şərtləri" },
  { id: "privacy", href: "/mexfilik-siyaseti", label: "Məxfilik siyasəti" },
  { id: "rules", href: "/qaydalar", label: "Qaydalar" },
  { id: "contact", href: "/elaqe", label: "Əlaqə" }
];

export function isTopbarItemActive(item: TopbarNavItem, pathname: string) {
  const activePaths = item.activeOn ?? [item.href];

  return activePaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function getActiveTopbarItemId(pathname: string) {
  return topbarNavItems.find((item) => isTopbarItemActive(item, pathname))?.id ?? "loads";
}
