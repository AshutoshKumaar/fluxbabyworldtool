"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "../../../lib/firebase";

import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  IndianRupee,
  User,
  FileText,
  LogOut
} from "lucide-react";

export default function Navbar({ role = "admin" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const logout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const NavItem = ({ icon: Icon, label, path }) => (
    <button
      onClick={() => {
        router.push(path);
        setOpen(false);
      }}
      className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition rounded-lg"
    >
      <Icon size={18} />
      {label}
    </button>
  );

  return (
    <>
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 w-full bg-white border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

          {/* LOGO */}
          <div
            className="flex items-center gap-4 cursor-pointer"
            onClick={() => router.push("/")}
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl">
              F
            </div>
            <div className="leading-tight">
              <h1 className="text-lg font-extrabold text-slate-800">
                Flux Baby World
              </h1>
              <p className="text-xs text-slate-500">
                School Management Portal
              </p>
            </div>
          </div>

          {/* DESKTOP MENU */}
          <div className="hidden md:flex items-center gap-6">
            <NavItem
              icon={LayoutDashboard}
              label="Dashboard"
              path={role === "admin" ? "/admin/dashboard" : "/parent/dashboard"}
            />

            {role === "admin" && (
              <>
                <NavItem icon={Users} label="Students" path="/admin/dashboard" />
                <NavItem icon={IndianRupee} label="Fees" path="/admin/dashboard" />
              </>
            )}

            {role === "parent" && (
              <>
                <NavItem icon={User} label="My Child" path="/parent/dashboard" />
                <NavItem icon={FileText} label="Admit Card" path="/parent/dashboard" />
              </>
            )}
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-flex px-4 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 capitalize">
              {role}
            </span>

            {/* LOGOUT (desktop) */}
            <button
              onClick={logout}
              className="hidden md:flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition"
            >
              <LogOut size={16} />
              Logout
            </button>

            {/* HAMBURGER */}
            <button
              onClick={() => setOpen(!open)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100"
            >
              {open ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {/* MOBILE MENU */}
      {open && (
        <div className="fixed top-[88px] left-0 w-full bg-white border-b border-slate-200 shadow-md md:hidden z-40">
          <div className="p-4 space-y-1">

            <NavItem
              icon={LayoutDashboard}
              label="Dashboard"
              path={role === "admin" ? "/admin/dashboard" : "/parent/dashboard"}
            />

            {role === "admin" && (
              <>
                <NavItem icon={Users} label="Students" path="/admin/dashboard" />
                <NavItem icon={IndianRupee} label="Fees" path="/admin/dashboard" />
              </>
            )}

            {role === "parent" && (
              <>
                <NavItem icon={User} label="My Child" path="/parent/dashboard" />
                <NavItem icon={FileText} label="Admit Card" path="/parent/dashboard" />
              </>
            )}

            <button
              onClick={logout}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      )}

      {/* SPACER */}
      <div className="h-[88px]" />
    </>
  );
}
