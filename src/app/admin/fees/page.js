"use client";

import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../lib/firebase";
import Navbar from "@/app/components/admin/navbar";
import StudentsFeesList from "@/app/components/admin/students-fees-list";

export default function AdminFeesPage() {
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState("");

  const fetchStudents = async () => {
    const snap = await getDocs(collection(db, "students"));
    const data = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    setStudents(data);
  };

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
        await fetchStudents();
      } catch (err) {
        console.error(err);
        setAccessError("Failed to verify admin access.");
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [router]);

  const fetchMonthlyFees = async (studentId) => {
    const snap = await getDocs(collection(db, "fees", studentId, "months"));
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ];
    const data = snap.docs.map((docSnap) => {
      const record = docSnap.data();
      return {
        id: docSnap.id,
        ...record,
        monthName: monthNames[(record.month || 1) - 1] || "Month"
      };
    });
    return data.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  };

  const saveMonthlyFees = async (studentId, input) => {
    const { month, year, totalFees, paidFees, transportFee } = input || {};
    if (
      !month ||
      !year ||
      totalFees === "" ||
      totalFees === null ||
      totalFees === undefined ||
      paidFees === "" ||
      paidFees === null ||
      paidFees === undefined
    ) {
      alert("Enter month, year, tuition and paid fees");
      return;
    }

    const transport = Number(transportFee || 0);
    const netTotalFees = Number(totalFees) + transport;
    const dueFees = netTotalFees - Number(paidFees);
    const monthId = `${year}-${String(month).padStart(2, "0")}`;

    await setDoc(
      doc(db, "fees", studentId, "months", monthId),
      {
        month: Number(month),
        year: Number(year),
        totalFees: Number(totalFees),
        transportFee: transport,
        netTotalFees,
        paidFees: Number(paidFees),
        dueFees,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  };

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
          Fees - Flux Baby World
        </h1>
        <StudentsFeesList
          students={students}
          onFetchMonthlyFees={fetchMonthlyFees}
          onSaveMonthlyFees={saveMonthlyFees}
        />
      </div>
    </div>
  );
}

