"use client";

import { useEffect, useMemo, useState } from "react";
import { auth, db } from "../../../lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/admin/navbar";
import AdmitCardPreview from "@/app/components/parents/admit-card-preview";
import FeeSummary from "@/app/components/parents/fee-summary";
import FeeHistory from "@/app/components/parents/fee-history";

const formatDate = (value) => {
  if (!value) return "--";
  if (String(value).includes("/")) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const getFeeDue = (fee) => {
  if (fee?.dueFees !== undefined && fee?.dueFees !== null) {
    return Number(fee.dueFees || 0);
  }
  const tuition = Number(fee?.totalFees || 0);
  const transport = Number(fee?.transportFee || 0);
  const net = Number(fee?.netTotalFees || tuition + transport);
  const paid = Number(fee?.paidFees || 0);
  return net - paid;
};

const getTotalDue = (fees = []) =>
  fees.reduce((sum, fee) => sum + getFeeDue(fee), 0);

const normalizeClassKey = (value) => {
  if (!value) return "";
  const str = String(value).toUpperCase();
  if (str.includes("UKG")) return "UKG";
  const match = str.match(/\d/);
  if (match) return match[0];
  return String(value).trim();
};

function ParentDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [fees, setFees] = useState([]);
  const [exam, setExam] = useState(null);
  const [scheduleRows, setScheduleRows] = useState([]);
  const [allowDownload, setAllowDownload] = useState(false);
  const [issued, setIssued] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [utrInput, setUtrInput] = useState("");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        if (userData?.role !== "parent") {
          setError("Only parent accounts can access this dashboard.");
          await signOut(auth);
          router.replace("/login");
          setLoading(false);
          return;
        }
        if (!userData?.studentId) {
          setError("Student profile not linked.");
          setLoading(false);
          return;
        }

        const studentDoc = await getDoc(
          doc(db, "students", userData.studentId)
        );
        if (!studentDoc.exists()) {
          setError("Student profile not found.");
          setLoading(false);
          return;
        }
        setStudent({ id: studentDoc.id, ...studentDoc.data() });

        const feesSnap = await getDocs(
          collection(db, "fees", userData.studentId, "months")
        );
        const feesData = feesSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        feesData.sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        });
        setFees(feesData);

        const examsSnap = await getDocs(collection(db, "exams"));
        const examsData = examsSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        examsData.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
        const latestExam = examsData[0] || null;
        setExam(latestExam);

        if (latestExam) {
          const classKey = normalizeClassKey(studentDoc.data()?.class || "");
          const scheduleDoc = await getDoc(
            doc(db, "exams", latestExam.id, "schedules", classKey)
          );
          const scheduleData = scheduleDoc.data()?.rows || [];
          setScheduleRows(scheduleData);

          const permissionDoc = await getDoc(
            doc(db, "exams", latestExam.id, "permissions", userData.studentId)
          );
          setAllowDownload(!!permissionDoc.data()?.allowDownload);
          setIssued(!!permissionDoc.data()?.issued);
          setPaymentRequest(permissionDoc.data()?.paymentRequest || null);
        }

        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Something went wrong. Please try again.");
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  const totalDue = useMemo(() => Math.max(0, getTotalDue(fees)), [fees]);
  const isPaid = totalDue <= 0;
  const paymentVerified = paymentRequest?.status === "verified";
  const canDownload = issued && (isPaid || allowDownload || paymentVerified);
  const blockReason = !issued
    ? "Admit card is not issued by admin yet."
    : paymentRequest?.status === "submitted"
      ? "Payment submitted. Waiting for admin verification."
    : !isPaid && !allowDownload
      ? "Your admit card could not be downloaded without clearing the due."
      : "";

  const handleDownload = () => {
    if (!student || !exam) return;
    if (!canDownload) {
      alert(blockReason || "Admit card download is not available.");
      return;
    }
    const rows = scheduleRows
      .map(
        (row) => `
          <tr>
            <td>${row.day}</td>
            <td>${row.date}</td>
            <td>${row.subject}</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <html>
        <head>
          <title>Admit Card</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Mooli&display=swap');
            body { font-family: 'Mooli', Arial, sans-serif; background: #f8fafc; padding: 24px; }
            .card { max-width: 820px; margin: 0 auto; background: white; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; }
            .header { display: flex; justify-content: center; align-items: center; padding: 20px 24px; background: linear-gradient(135deg, #4f46e5, #2563eb); color: white; text-align: center; }
            .school { font-size: 20px; font-weight: bold; }
            .content { padding: 24px; }
            .row { display: flex; gap: 16px; }
            .photo { width: 120px; height: 140px; border: 1px solid #e2e8f0; border-radius: 12px; object-fit: cover; background: #f1f5f9; }
            .grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; margin-top: 12px; }
            .field { background: #f8fafc; padding: 10px 12px; border-radius: 10px; font-size: 13px; }
            .label { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
            .value { font-weight: 600; color: #0f172a; margin-top: 4px; }
            .exam { margin-top: 16px; padding: 12px; border: 1px dashed #cbd5f5; border-radius: 12px; }
            .note { margin-top: 12px; font-size: 12px; color: #334155; background: #ecfeff; padding: 8px 10px; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { border: 1px solid #cbd5f5; padding: 6px 8px; text-align: left; }
            th { background: #eff6ff; text-transform: uppercase; letter-spacing: .06em; font-size: 11px; }
            .footer { display: flex; justify-content: space-between; margin-top: 24px; font-size: 12px; color: #475569; }
            .sign-box { width: 180px; height: 70px; border: 1px dashed #cbd5f5; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 11px; }
            .seal { width: 120px; height: 70px; border: 1px dashed #cbd5f5; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 11px; }
            @media print { body { background: white; padding: 0; } .card { border: none; } }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div>
                <div class="school">Flux Baby World</div>
                <div>Final Term Examination Date Sheet ${exam.session || ""}</div>
              </div>
            </div>
            <div class="content">
              <div class="row">
                <img class="photo" src="${student.photoUrl || ""}" alt="Student Photo" />
                <div style="flex:1;">
                  <div class="grid">
                    <div class="field">
                      <div class="label">Student Name</div>
                      <div class="value">${student.name || "--"}</div>
                    </div>
                    <div class="field">
                      <div class="label">Class</div>
                      <div class="value">${student.class || "--"}${student.section ? ` (${student.section})` : ""}</div>
                    </div>
                    <div class="field">
                      <div class="label">Roll No</div>
                      <div class="value">${student.rollNo || "--"}</div>
                    </div>
                    <div class="field">
                      <div class="label">Date of Birth</div>
                      <div class="value">${student.dob || "--"}</div>
                    </div>
                    <div class="field">
                      <div class="label">Father Name</div>
                      <div class="value">${student.fatherName || "--"}</div>
                    </div>
                    <div class="field">
                      <div class="label">Contact</div>
                      <div class="value">${student.contactNo || "--"}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="exam">
                <div class="grid">
                  <div class="field">
                    <div class="label">Exam Name</div>
                    <div class="value">${exam.examName || ""}</div>
                  </div>
                  <div class="field">
                    <div class="label">Session</div>
                    <div class="value">${exam.session || ""}</div>
                  </div>
                  <div class="field">
                    <div class="label">Date</div>
                    <div class="value">${formatDate(exam.examDate || "")}</div>
                  </div>
                  <div class="field">
                    <div class="label">Time</div>
                    <div class="value">${exam.examTime || ""}</div>
                  </div>
                  <div class="field" style="grid-column: span 2;">
                    <div class="label">Exam Center</div>
                    <div class="value">${exam.examCenter || ""}</div>
                  </div>
                </div>
              </div>

              <div class="note">Note: Reporting Timing: ${exam.reportingTime || ""}</div>
              <table>
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Date</th>
                    <th>Subject</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
              </table>

              <div class="footer">
                <div><div class="sign-box">Principal Signature</div></div>
                <div><div class="sign-box">Class Teacher Signature</div></div>
                <div><div class="seal">School Seal</div></div>
              </div>
            </div>
          </div>
          <script>
            window.onload = () => window.print();
          </script>
        </body>
      </html>
    `;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  const handlePayNow = () => {
    const upiId = "7549298707@ibl";
    const payeeName = "Anshu Kumar";
    const amount = totalDue > 0 ? totalDue : 1;
    const tr = `FBW-${student?.id || "STD"}-${Date.now()}`;
    const tn = `School fee ${student?.name || ""} ${exam?.session || ""}`.trim();
    const url = `upi://pay?pa=${encodeURIComponent(
      upiId
    )}&pn=${encodeURIComponent(payeeName)}&am=${encodeURIComponent(
      amount
    )}&cu=INR&tr=${encodeURIComponent(tr)}&tn=${encodeURIComponent(tn)}`;
    window.open(url, "_blank");
  };

  const handleSubmitPaymentRequest = async () => {
    if (!student?.id || !exam?.id) return;
    const utr = utrInput.trim();
    if (utr.length < 8) {
      alert("Enter valid UTR/Ref number.");
      return;
    }
    setPaymentSubmitting(true);
    try {
      const tr = `FBW-${student.id}-${Date.now()}`;
      const tn = `School fee ${student.name || ""} ${exam.session || ""}`.trim();
      const request = {
        utr,
        tr,
        tn,
        amount: totalDue > 0 ? totalDue : 0,
        status: "submitted",
        submittedAt: serverTimestamp()
      };
      await setDoc(
        doc(db, "exams", exam.id, "permissions", student.id),
        {
          paymentRequest: request,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      setPaymentRequest({ ...request, submittedAt: new Date() });
      setUtrInput("");
      alert("Payment proof submitted. Waiting for admin verification.");
    } catch (err) {
      console.error(err);
      alert("Could not submit payment proof. Try again.");
    } finally {
      setPaymentSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100">
        <Navbar role="parent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-indigo-200" />
              <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-slate-800">
                Loading your dashboard
              </p>
              <p className="text-sm text-slate-500">
                Fetching student profile and fee status...
              </p>
            </div>
            <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="card-soft h-28 animate-pulse" />
              <div className="card-soft h-28 animate-pulse" />
              <div className="card-soft h-36 animate-pulse sm:col-span-2" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100">
        <Navbar role="parent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="card-soft p-6 text-center">
            <p className="text-rose-600 font-semibold">{error}</p>
            <button
              type="button"
              onClick={() => router.replace("/login")}
              className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-100 min-h-screen">
      <Navbar role="parent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Parent Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Review admit card details and clear dues to download.
          </p>
        </div>

        {!student ? (
          <div className="text-slate-500">No student data available.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
            <AdmitCardPreview
              student={student}
              exam={exam}
              scheduleRows={scheduleRows}
              canDownload={canDownload}
              blockReason={blockReason}
              onDownload={handleDownload}
              formatDate={formatDate}
            />

            <div className="space-y-4">
              <FeeSummary
                totalDue={totalDue}
                isPaid={isPaid}
                canDownload={canDownload}
                blockReason={blockReason}
                onDownload={handleDownload}
                onPayNow={handlePayNow}
              />
              <div className="card-soft">
                <p className="card-title">Payment Verification</p>
                <p className="mt-2 text-xs text-slate-500">
                  After payment, submit UTR/Ref no. Admin will verify and unlock admit card.
                </p>
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={utrInput}
                    onChange={(e) => setUtrInput(e.target.value)}
                    placeholder="Enter UTR / Transaction Ref No"
                    className="h-10 flex-1 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleSubmitPaymentRequest}
                    disabled={paymentSubmitting}
                    className="h-10 px-4 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {paymentSubmitting ? "Submitting..." : "I Have Paid"}
                  </button>
                </div>
                {paymentRequest?.status && (
                  <div className="mt-3 text-sm">
                    <span className="text-slate-500">Status: </span>
                    <span
                      className={`font-semibold ${
                        paymentRequest.status === "verified"
                          ? "text-emerald-600"
                          : paymentRequest.status === "submitted"
                            ? "text-amber-600"
                            : "text-rose-600"
                      }`}
                    >
                      {paymentRequest.status}
                    </span>
                    {paymentRequest.utr && (
                      <p className="text-xs text-slate-500 mt-1">
                        Last UTR: {paymentRequest.utr}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <FeeHistory fees={fees} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ParentDashboard;
