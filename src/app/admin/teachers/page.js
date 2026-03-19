"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, getDocs, collection } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../lib/firebase";
import Navbar from "@/app/components/admin/navbar";
import TeacherManagementSection from "@/app/components/admin/teacher-management-section";

export default function AdminTeachersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState("");
  const [students, setStudents] = useState([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const roleSnap = await getDoc(doc(db, "users", user.uid));
        if (roleSnap.data()?.role !== "admin") {
          setAccessError("Only admin users can access this page.");
          await signOut(auth);
          return;
        }

        const studentsSnap = await getDocs(collection(db, "students"));
        setStudents(
          studentsSnap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data()
          }))
        );
      } catch (err) {
        console.error(err);
        setAccessError("Failed to verify admin access.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100">
        <Navbar role="admin" />
      </div>
    );
  }

  if (accessError) {
    return (
      <div className="min-h-screen bg-slate-100">
        <Navbar role="admin" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="card-soft p-6 text-center">
            <p className="text-rose-600 font-semibold">{accessError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-100 min-h-screen">
      <Navbar role="admin" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-indigo-700 mb-6">
          Teachers - Flux Baby World
        </h1>
        <TeacherManagementSection students={students} />
      </div>
    </div>
  );
}
