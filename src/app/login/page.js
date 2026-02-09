"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [isParent, setIsParent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    try {
      setLoading(true);

      const res = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const uid = res.user.uid;

      // 🔥 Role check from Firestore
      const snap = await getDoc(doc(db, "users", uid));

      if (!snap.exists()) {
        alert("No role assigned. Contact school admin.");
        return;
      }

      const role = snap.data().role;

      if (role === "admin") {
        router.push("/admin/dashboard");
      } else if (role === "parent") {
        router.push("/parent/dashboard");
      } else {
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
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-indigo-100 via-blue-100 to-sky-100 px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8">

        {/* Branding */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-indigo-700">
            Flux Baby World
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Secure School Examination Portal
          </p>
        </div>

        {/* Role Toggle */}
        <div className="flex mb-6 bg-gray-100 rounded-full p-1">
          <button
            onClick={() => setIsParent(false)}
            className={`w-1/2 py-2 rounded-full text-sm font-semibold transition ${
              !isParent
                ? "bg-indigo-600 text-white shadow"
                : "text-gray-600"
            }`}
          >
            Admin Login
          </button>
          <button
            onClick={() => setIsParent(true)}
            className={`w-1/2 py-2 rounded-full text-sm font-semibold transition ${
              isParent
                ? "bg-indigo-600 text-white shadow"
                : "text-gray-600"
            }`}
          >
            Parent Login
          </button>
        </div>

        {/* Email */}
        <label className="text-sm text-gray-600">
          {isParent ? "Parent Email" : "Admin Email"}
        </label>
        <input
          type="email"
          value={email}
          className="w-full mt-1 mb-4 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* Password */}
        <label className="text-sm text-gray-600">Password</label>
        <input
          type="password"
          value={password}
          className="w-full mt-1 mb-6 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
          onChange={(e) => setPassword(e.target.value)}
        />

        {/* Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold transition disabled:opacity-70"
        >
          {loading ? (
            <span className="inline-flex items-center justify-center gap-3">
              <span className="relative inline-flex h-5 w-5">
                <span className="absolute inset-0 rounded-full border-2 border-indigo-200" />
                <span className="absolute inset-0 rounded-full border-2 border-white border-t-transparent animate-spin" />
              </span>
              Signing in...
            </span>
          ) : isParent ? (
            "Login as Parent"
          ) : (
            "Login as Admin"
          )}
        </button>

        <p className="text-center text-xs text-gray-400 mt-8">
          © {new Date().getFullYear()} Flux Baby World • All Rights Reserved
        </p>
      </div>
    </div>
  );
}
