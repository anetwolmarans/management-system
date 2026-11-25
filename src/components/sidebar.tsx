"use client";

import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";
import { ChevronsLeft, Smartphone, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Sidebar({ role, managerName, managerRole, onSignOut }: {
  role?: string;
  managerName?: string;
  managerRole?: string;
  onSignOut?: () => void;
}) {
  const activeSection = useAppStore((s) => s.activeSection);
  const setActiveSection = useAppStore((s) => s.setActiveSection);
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggle = useAppStore((s) => s.toggleSidebar);

  const items = NAV_ITEMS.filter((n) => !n.roles || (role && n.roles.includes(role)));

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Brand header */}
      <div className="flex items-center h-16 px-4 shrink-0 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
          <BrandLogo variant="inverse" className="h-9 w-9 shrink-0" />
          {!collapsed && (
            <div className="flex flex-col leading-tight overflow-hidden">
              <span className="font-extrabold text-[14px] tracking-wide text-white">Management System</span>
              <span className="text-[9px] text-[#00AEEF] font-bold uppercase tracking-[0.18em]">
                Manager Suite
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1 scrollbar-thin">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              title={collapsed ? item.label : undefined}
              className={cn(
                "w-full flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-semibold transition-all group",
                collapsed && "justify-center px-2 rounded-xl",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
              {!collapsed && active && (
                <span className="h-1.5 w-1.5 rounded-full bg-sidebar-primary-foreground/70" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Employee app shortcut — opens the standalone /portal route */}
      <div className="px-2.5 pb-1 shrink-0">
        <a
          href="/portal"
          target="_blank"
          rel="noopener noreferrer"
          title={collapsed ? "Open Employee App" : undefined}
          className={cn(
            "flex items-center gap-2 text-[#00AEEF] hover:bg-sidebar-accent hover:text-[#00AEEF] rounded-full font-semibold transition-colors",
            "h-8 text-sm",
            collapsed ? "w-8 justify-center" : "px-3 justify-start",
          )}
        >
          <Smartphone className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Employee App</span>}
        </a>
      </div>

      {/* User card — shows the signed-in manager */}
      {!collapsed && (
        <div className="mx-2.5 mb-1 p-3 rounded-2xl bg-sidebar-accent flex items-center gap-2.5">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-[11px] font-bold">
              {(managerName ?? "?").split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 leading-tight flex-1">
            <p className="text-xs font-bold truncate">{managerName ?? "Manager"}</p>
            <p className="text-[10px] text-sidebar-foreground/60 truncate capitalize">{managerRole ?? "manager"}</p>
          </div>
          {onSignOut && (
            <button
              onClick={onSignOut}
              title="Sign out"
              className="shrink-0 text-sidebar-foreground/50 hover:text-sidebar-foreground p-1"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      <div className="p-2.5 pt-0 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggle}
          className="w-full justify-center text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground rounded-full"
        >
          <ChevronsLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          {!collapsed && <span className="ml-2">Collapse</span>}
        </Button>
      </div>
    </aside>
  );
}
