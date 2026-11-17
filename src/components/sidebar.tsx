"use client";

import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { WorkhubLogo } from "@/components/workhub-logo";
import { ChevronsLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Sidebar() {
  const activeSection = useAppStore((s) => s.activeSection);
  const setActiveSection = useAppStore((s) => s.setActiveSection);
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggle = useAppStore((s) => s.toggleSidebar);

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
          <WorkhubLogo className="h-8 w-8 shrink-0" />
          {!collapsed && (
            <div className="flex flex-col leading-tight overflow-hidden">
              <span className="font-extrabold text-[15px] tracking-tight">WorkHub</span>
              <span className="text-[10px] text-sidebar-foreground/60 font-semibold uppercase tracking-wider">
                Manager Suite
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1 scrollbar-thin">
        {NAV_ITEMS.map((item) => {
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

      {/* User card */}
      {!collapsed && (
        <div className="mx-2.5 mb-2 p-3 rounded-2xl bg-sidebar-accent flex items-center gap-2.5">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-[11px] font-bold">
              SC
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 leading-tight">
            <p className="text-xs font-bold truncate">Sarah Chen</p>
            <p className="text-[10px] text-sidebar-foreground/60 truncate">Operations Manager</p>
          </div>
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
