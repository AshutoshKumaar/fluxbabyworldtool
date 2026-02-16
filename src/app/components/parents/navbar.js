"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Home, FileText, LogOut, Menu, X } from "lucide-react";
import { auth } from "../../../lib/firebase";

function NavButton({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
    >
      <Icon size={16} />
      <span>{label}</span>
    </button>
  );
}

export default function ParentNavbar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const gotoDashboard = () => {
    router.push("/parent/dashboard");
    setOpen(false);
  };

  const logout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <>
      <nav className="fixed top-0 left-0 w-full bg-white border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/parent/dashboard")}
            className="flex items-center gap-3"
          >
            <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
              F
            </div>
            <div className="text-left">
              <p className="text-lg font-bold text-slate-900 leading-tight">
                Flux Baby World
              </p>
              <p className="text-xs text-slate-500">Parent Portal</p>
            </div>
          </button>

          <div className="hidden md:flex items-center gap-2">
            <NavButton icon={Home} label="Dashboard" onClick={gotoDashboard} />
            <NavButton icon={FileText} label="Admit Card" onClick={gotoDashboard} />
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="fixed top-[76px] left-0 w-full bg-white border-b border-slate-200 shadow-md md:hidden z-40">
          <div className="max-w-7xl mx-auto px-4 py-3 space-y-1">
            <NavButton icon={Home} label="Dashboard" onClick={gotoDashboard} />
            <NavButton icon={FileText} label="Admit Card" onClick={gotoDashboard} />
            <button
              type="button"
              onClick={logout}
              className="w-full text-left inline-flex items-center gap-2 px-3 py-2 rounded-lg text-rose-600 font-semibold hover:bg-rose-50"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      )}

      <div className="h-[76px]" />
    </>
  );
}

