import { NavLink, Outlet } from "react-router";

import { env } from "@/shared/config/env";
import { cn } from "@/shared/lib/utils";

const navItems = [
  { to: "/", label: "Home", end: true },
  { to: "/health", label: "Health", end: false },
] as const;

export const RootLayout = () => (
  <div className="min-h-svh bg-background text-foreground">
    <header className="border-b">
      <nav aria-label="Main" className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-4">
        <span className="font-heading font-semibold">{env.VITE_APP_TITLE}</span>
        <ul className="flex gap-4 text-sm">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn("text-muted-foreground hover:text-foreground", isActive && "font-medium text-foreground")
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Outlet />
    </main>
  </div>
);
