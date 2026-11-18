"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAppStore } from "@/lib/store";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";

export function MobileNav() {
  const open = useAppStore((s) => s.mobileNavOpen);
  const setOpen = useAppStore((s) => s.setMobileNavOpen);
  const activeSection = useAppStore((s) => s.activeSection);
  const setActiveSection = useAppStore((s) => s.setActiveSection);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="px-4 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <BrandLogo className="h-8 w-8" />
            <div className="flex flex-col leading-tight">
              <span className="font-extrabold text-sm tracking-wide text-[#01205E]">Management System</span>
              <span className="text-[9px] text-muted-foreground font-normal uppercase tracking-[0.15em]">
                Manager Suite
              </span>
            </div>
          </SheetTitle>
        </SheetHeader>
        <nav className="py-3 px-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
