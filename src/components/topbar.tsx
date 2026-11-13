"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Menu, Search, Bell, RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAppStore } from "@/lib/store";
import { NAV_ITEMS } from "@/lib/nav";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export function Topbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const setMobileNavOpen = useAppStore((s) => s.setMobileNavOpen);
  const activeSection = useAppStore((s) => s.activeSection);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    Promise.resolve().then(() => setMounted(true));
    // Fetch dashboard to get notification count (open complaints + pending leave)
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) =>
        setNotifCount((d?.kpis?.openComplaints ?? 0) + (d?.kpis?.pendingLeave ?? 0)),
      )
      .catch(() => {});
  }, []);

  const active = NAV_ITEMS.find((n) => n.id === activeSection);

  const handleReseed = async () => {
    toast.loading("Re-seeding database…", { id: "reseed" });
    try {
      const r = await fetch("/api/seed", { method: "POST" });
      const d = await r.json();
      if (d.ok) {
        toast.success("Database re-seeded. Reloading…", { id: "reseed" });
        setTimeout(() => window.location.reload(), 800);
      } else {
        toast.error("Re-seed failed", { id: "reseed" });
      }
    } catch {
      toast.error("Re-seed failed", { id: "reseed" });
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex flex-col min-w-0 flex-1">
        <h1 className="text-base md:text-lg font-semibold truncate">
          {active?.label ?? "Dashboard"}
        </h1>
        <p className="text-xs text-muted-foreground truncate hidden sm:block">
          {active?.description}
        </p>
      </div>

      <div className="relative hidden md:block w-64 lg:w-80">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search employees, vehicles…"
          className="pl-8 h-9 bg-muted/40 border-0 focus-visible:ring-1 focus-visible:ring-ring"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const value = (e.target as HTMLInputElement).value;
              if (value) toast.info(`Search: "${value}" — use module filters for live search`);
            }
          }}
        />
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleReseed}
        title="Reset demo data"
        aria-label="Reset demo data"
        className="hidden sm:inline-flex"
      >
        <RefreshCw className="h-4 w-4" />
      </Button>

      {mounted && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell className="h-4 w-4" />
            {notifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                {notifCount > 99 ? "99+" : notifCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => useAppStore.getState().setActiveSection("complaints")}>
            Open complaints & cases
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => useAppStore.getState().setActiveSection("leave")}>
            Pending leave requests
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => useAppStore.getState().setActiveSection("timesheets")}>
            Timesheets awaiting approval
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-muted transition-colors" aria-label="Account menu">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                SC
              </AvatarFallback>
            </Avatar>
            <span className="hidden lg:block text-xs font-medium">Sarah Chen</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="text-sm font-medium">Sarah Chen</span>
              <span className="text-xs text-muted-foreground font-normal">Operations Manager</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Profile settings</DropdownMenuItem>
          <DropdownMenuItem>Company settings</DropdownMenuItem>
          <DropdownMenuItem>Help & support</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive">
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
