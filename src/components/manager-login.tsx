"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, Building2 } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { toast } from "sonner";

const SESSION_KEY = "ms-manager-session";

export interface ManagerSession {
  token: string;
  role: string;
  employee: {
    id: string;
    employeeNo: string;
    name: string;
    email: string;
    position: string;
    department: string;
    role: string;
  };
}

export function getManagerSession(): ManagerSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as ManagerSession) : null;
  } catch {
    return null;
  }
}

export function clearManagerSession() {
  if (typeof window !== "undefined") localStorage.removeItem(SESSION_KEY);
}

export function ManagerLogin({ onSignedIn }: { onSignedIn: (s: ManagerSession) => void }) {
  const [identifier, setIdentifier] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const signIn = async () => {
    setError("");
    if (!identifier.trim() || !pin.trim()) {
      setError("Enter your employee number and PIN.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), pin: pin.trim() }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error ?? "Sign in failed");
        return;
      }
      localStorage.setItem(SESSION_KEY, JSON.stringify(d));
      toast.success(`Welcome, ${d.employee.name.split(" ")[0]}`);
      onSignedIn(d as ManagerSession);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col md:items-center justify-center p-4">
      <div className="w-full md:max-w-md min-h-screen md:min-h-0 md:rounded-3xl md:border md:shadow-xl flex flex-col bg-background overflow-hidden">
        {/* Brand hero */}
        <div className="hero-gradient px-6 pt-10 pb-12 text-white relative overflow-hidden">
          <div className="absolute -top-10 -right-10 h-44 w-44 rounded-full bg-white/10" aria-hidden="true" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/25">
                <BrandLogo variant="inverse" className="h-9 w-9" />
              </div>
              <div>
                <p className="font-extrabold text-xl tracking-wide leading-none">Management System</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#7FCBEC] mt-1 flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Manager Suite
                </p>
              </div>
            </div>
            <h1 className="mt-7 text-2xl font-extrabold leading-snug">Manage your operations.</h1>
            <p className="mt-1.5 text-sm text-white/80">Sign in with your employee number and PIN.</p>
          </div>
        </div>

        {/* Login card */}
        <div className="flex-1 p-5 -mt-6">
          <Card className="shadow-lg border-border/70">
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="mgr-id">Employee number</Label>
                <Input
                  id="mgr-id"
                  placeholder="e.g. MS-1002 or 1002"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && signIn()}
                  autoCapitalize="characters"
                  autoCorrect="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mgr-pin">PIN</Label>
                <Input
                  id="mgr-pin"
                  type="password"
                  inputMode="numeric"
                  placeholder="Your PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && signIn()}
                />
              </div>
              {error && (
                <p className="text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 rounded-md px-3 py-2">{error}</p>
              )}
              <Button
                onClick={signIn}
                disabled={busy}
                className="w-full h-11 bg-[#00AEEF] text-[#01205E] hover:bg-[#00AEEF]/90 font-bold text-[15px]"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                Sign in
              </Button>
            </CardContent>
          </Card>

          <Card className="mt-4 border-dashed bg-muted/40">
            <CardContent className="p-4 text-xs text-muted-foreground space-y-1.5">
              <p className="font-bold text-foreground">Try the demo</p>
              <p>Owner: <span className="font-mono font-semibold">MS-1002</span> · PIN <span className="font-mono font-semibold">1002</span></p>
              <p className="text-[10px]">Manager: <span className="font-mono font-semibold">MS-1001</span> · PIN <span className="font-mono font-semibold">0000</span></p>
              <Button
                size="sm"
                variant="outline"
                className="h-7 mt-1"
                onClick={() => { setIdentifier("MS-1002"); setPin("1002"); }}
              >
                Fill owner credentials
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
