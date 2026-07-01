"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  Home,
  UtensilsCrossed,
  ScanBarcode,
  TrendingUp,
  User,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  center?: boolean;
};

const items: NavItem[] = [
  { href: "/dnes", label: "Dnes", icon: Home },
  { href: "/jedalnicek", label: "Jedálniček", icon: UtensilsCrossed },
  { href: "/skener", label: "Skener", icon: ScanBarcode, center: true },
  { href: "/progres", label: "Progres", icon: TrendingUp },
  { href: "/profil", label: "Profil", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md border-t border-border bg-bg/75 backdrop-blur-2xl">
      <ul className="grid h-[72px] grid-cols-5 items-center px-3">
        {items.map(({ href, label, icon: Icon, center }) => {
          const active = pathname === href || pathname.startsWith(href + "/");

          if (center) {
            return (
              <li key={href} className="flex justify-center">
                <Link
                  href={href}
                  aria-label={label}
                  className="-mt-8 flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-b from-[#bcff66] to-[#9bff22] text-accent-fg shadow-[0_8px_28px_rgba(168,255,62,0.45)] ring-[6px] ring-bg transition active:scale-90"
                >
                  <ScanBarcode className="h-[26px] w-[26px]" strokeWidth={2.25} />
                </Link>
              </li>
            );
          }

          return (
            <li key={href} className="flex justify-center">
              <Link
                href={href}
                aria-label={label}
                className="relative flex h-14 w-full max-w-[64px] flex-col items-center justify-center"
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-1 rounded-[18px] bg-gradient-to-b from-accent/[0.16] to-accent/[0.04] ring-1 ring-inset ring-accent/25 shadow-[0_0_22px_rgba(168,255,62,0.10)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex flex-col items-center gap-1">
                  <Icon
                    className={`h-[22px] w-[22px] transition-colors duration-300 ${active ? "text-accent" : "text-[#555555]"}`}
                    strokeWidth={1.5}
                  />
                  <span
                    className={`text-[9px] font-semibold uppercase tracking-[0.04em] transition-opacity duration-200 ${active ? "text-accent opacity-100" : "opacity-0"}`}
                  >
                    {label}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
