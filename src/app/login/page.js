"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { ChevronDown, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

const roleMeta = {
  admin: {
    label: "Admin Login",
    accent: "from-indigo-600 to-violet-600",
    ring: "focus:ring-indigo-400",
    helper: "School operations, admissions, marksheets, fees, and monitoring."
  },
  teacher: {
    label: "Teacher Login",
    accent: "from-emerald-500 to-teal-600",
    ring: "focus:ring-emerald-400",
    helper: "Attendance, homework, class work, and daily academic updates."
  },
  parent: {
    label: "Parent Login",
    accent: "from-sky-500 to-cyan-600",
    ring: "focus:ring-sky-400",
    helper: "View admit card, attendance, report card, homework, and notices."
  }
};

const inputBase =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400";

export default function LoginPage() {
  const router = useRouter();
  const [loginRole, setLoginRole] = useState("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const activeRole = roleMeta[loginRole];

  const handleLogin = async (event) => {
    event?.preventDefault();

    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    try {
      setLoading(true);

      const res = await signInWithEmailAndPassword(auth, email, password);
      const uid = res.user.uid;
      const snap = await getDoc(doc(db, "users", uid));

      if (!snap.exists()) {
        await auth.signOut();
        alert("No role assigned. Contact school admin.");
        return;
      }

      const role = snap.data().role;
      const isActive = snap.data().isActive !== false;
      const isTeacherRole = role === "teacher" || role === "class_teacher";

      if (loginRole === "parent" && role !== "parent") {
        await auth.signOut();
        alert("Please use the correct login option for this account.");
        return;
      }
      if (loginRole === "admin" && role !== "admin") {
        await auth.signOut();
        alert("Please use the correct login option for this account.");
        return;
      }
      if (loginRole === "teacher" && !isTeacherRole) {
        await auth.signOut();
        alert("Please use the correct login option for this account.");
        return;
      }
      if (isTeacherRole && !isActive) {
        await auth.signOut();
        alert("Teacher account is inactive. Contact school admin.");
        return;
      }

      if (role === "admin") {
        router.push("/admin/dashboard");
      } else if (isTeacherRole) {
        router.push("/teacher/dashboard");
      } else if (role === "parent") {
        router.push("/parent/dashboard");
      } else {
        await auth.signOut();
        alert("Invalid role");
      }
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(135deg,#eef4ff_0%,#f8fbff_48%,#eef7ff_100%)] px-4 py-10 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/70 bg-white/90 shadow-[0_28px_80px_rgba(15,23,42,0.14)] backdrop-blur xl:grid-cols-[1.05fr_0.95fr]">
          <div className="hidden bg-[linear-gradient(160deg,#172554_0%,#1d4ed8_45%,#0f766e_100%)] p-10 text-white xl:flex xl:flex-col xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
                <ShieldCheck size={16} />
                Flux Baby World School Portal
              </div>
              <h1 className="mt-8 max-w-md text-5xl font-semibold leading-[1.05]">
                One login space for admin, teachers, and parents.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-blue-50/90">
                Choose the correct portal role, sign in securely, and continue your daily school workflow without confusion.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
              {Object.entries(roleMeta).map(([key, value]) => (
                <div
                  key={key}
                  className={`rounded-3xl border px-5 py-4 transition ${
                    loginRole === key
                      ? "border-white/30 bg-white/14 shadow-lg"
                      : "border-white/10 bg-white/6"
                  }`}
                >
                  <p className="text-lg font-semibold">{value.label}</p>
                  <p className="mt-2 text-sm leading-6 text-blue-50/85">{value.helper}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            <div className="mx-auto max-w-lg">
              <div className="mb-8">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Welcome Back
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  Sign in to Flux Baby World
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Select login role from the dropdown below, then enter the correct school credentials.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="rounded-[28px] border border-slate-200 bg-slate-50/90 p-4 shadow-sm">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Login Role
                  </label>
                  <div className="relative">
                    <select
                      value={loginRole}
                      onChange={(e) => setLoginRole(e.target.value)}
                      className="h-14 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 pr-12 text-base font-semibold text-slate-800 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                    >
                      <option value="admin">Admin Login</option>
                      <option value="teacher">Teacher Login</option>
                      <option value="parent">Parent Login</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  </div>
                  <div className={`mt-4 rounded-2xl bg-gradient-to-r ${activeRole.accent} p-[1px]`}>
                    <div className="rounded-[15px] bg-white/95 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-800">{activeRole.label}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{activeRole.helper}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">
                    {loginRole === "parent"
                      ? "Parent Email"
                      : loginRole === "teacher"
                        ? "Teacher Email"
                        : "Admin Email"}
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      placeholder={
                        loginRole === "parent"
                          ? "Enter parent email"
                          : loginRole === "teacher"
                            ? "Enter teacher email"
                            : "Enter admin email"
                      }
                      className={`${inputBase} ${activeRole.ring} pl-11`}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">Password</label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      placeholder="Enter password"
                      className={`${inputBase} ${activeRole.ring} pl-11`}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full rounded-2xl bg-gradient-to-r ${activeRole.accent} px-5 py-3.5 text-base font-semibold text-white shadow-[0_16px_34px_rgba(59,130,246,0.2)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  {loading ? (
                    <span className="inline-flex items-center justify-center gap-3">
                      <span className="relative inline-flex h-5 w-5">
                        <span className="absolute inset-0 rounded-full border-2 border-white/30" />
                        <span className="absolute inset-0 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      </span>
                      Signing in...
                    </span>
                  ) : (
                    `Continue as ${roleMeta[loginRole].label.replace(" Login", "")}`
                  )}
                </button>
              </form>

              <p className="mt-8 text-center text-xs text-slate-400">
                © {new Date().getFullYear()} Flux Baby World School • All Rights Reserved
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
