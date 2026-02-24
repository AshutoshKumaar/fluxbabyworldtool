"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
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
import ParentNavbar from "@/app/components/parents/navbar";
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

const makeUpiRefId = () => {
  // Keep short and alphanumeric for strict UPI apps (Paytm etc.)
  const timePart = Date.now().toString().slice(-8);
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `FBW${timePart}${randomPart}`.slice(0, 24);
};

const DEMO_UPI_ID = "7079666741-0@airtel";
const DEMO_PAYEE_NAME = "Flux Baby World";
const ADMIN_WHATSAPP_NUMBER = "917549298707";

function ParentDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [fees, setFees] = useState([]);
  const [exam, setExam] = useState(null);
  const [scheduleRows, setScheduleRows] = useState([]);
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [utrInput, setUtrInput] = useState("");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrDownloading, setQrDownloading] = useState(false);
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
  const canDownload = isPaid;
  const blockReason = !isPaid
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
            @page { size: A4 portrait; margin: 8mm; }
            * { box-sizing: border-box; }
            body { font-family: 'Mooli', Arial, sans-serif; background: #f8fafc; padding: 0; margin: 0; }
            .card { width: 100%; max-width: 194mm; margin: 0 auto; background: white; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; page-break-inside: avoid; }
            .header { display: flex; gap: 14px; align-items: center; padding: 12px 16px; background: #fef08a; border-bottom: 2px solid #facc15; }
            .school-logo { width: 60px; height: 60px; object-fit: contain; }
            .header-meta { flex: 1; text-align: center; color: #111827; line-height: 1.18; padding-right: 18px; }
            .reg { font-size: 11px; font-weight: 700; margin-bottom: 4px; }
            .school { font-size: 30px; line-height: 1; font-weight: 800; color: #7f1d1d; margin: 0 0 4px; }
            .addr { font-size: 12px; font-weight: 700; margin-top: 2px; }
            .contact { font-size: 12px; font-weight: 700; margin-top: 2px; }
            .email { font-size: 12px; font-weight: 700; margin-top: 2px; }
            .exam-banner { text-align: center; padding: 6px 10px; background: #ecfeff; border-top: 1px solid #bae6fd; border-bottom: 1px solid #bae6fd; font-weight: 700; font-size: 12px; color: #0f172a; }
            .content { padding: 10px; min-height: 218mm; display: flex; flex-direction: column; }
            .row { display: flex; gap: 12px; }
            .photo { width: 100px; height: 116px; border: 1px solid #e2e8f0; border-radius: 10px; object-fit: cover; background: #f1f5f9; }
            .grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 8px; margin-top: 8px; }
            .field { background: #f8fafc; padding: 8px 10px; border-radius: 8px; font-size: 12px; }
            .label { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
            .value { font-weight: 600; color: #0f172a; margin-top: 4px; }
            .exam { margin-top: 10px; padding: 10px; border: 1px dashed #cbd5f5; border-radius: 10px; }
            .note { margin-top: 8px; font-size: 11px; color: #334155; background: #ecfeff; padding: 6px 8px; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
            th, td { border: 1px solid #cbd5f5; padding: 4px 6px; text-align: left; line-height: 1.2; }
            th { background: #eff6ff; text-transform: uppercase; letter-spacing: .05em; font-size: 10px; }
            .footer { display: flex; margin-top: auto; padding-top: 10px; font-size: 11px; color: #475569; page-break-inside: avoid; }
            .footer > div { flex: 1; display: flex; }
            .footer > div:nth-child(1) { justify-content: flex-start; }
            .footer > div:nth-child(2) { justify-content: center; }
            .footer > div:nth-child(3) { justify-content: flex-end; }
            .sign-box { width: 170px; height: 58px; border: 1px dashed #cbd5f5; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 10px; }
            .seal { width: 120px; height: 58px; border: 1px dashed #cbd5f5; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 10px; }
            @media print { body { background: white; padding: 0; } .card { border: none; border-radius: 0; max-width: 100%; min-height: auto; } }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <img class="school-logo" src="/logo.png" alt="School Logo" />
              <div class="header-meta">
                <div class="reg">Udyam Org. Reg No. BR-16-0009367</div>
                <div class="school">Flux Baby World School</div>
                <div class="addr">Rajhatha, Behind Dr. N.K. Jha, Kalibari Road, Katihar</div>
                <div class="contact">Cont. Us: 9122946266, 06452-358666</div>
                <div class="email">E-mail: fluxbabyworld@gmail.com</div>
              </div>
            </div>
            <div class="exam-banner">FINAL TERM EXAMINATION DATE SHEET ${exam.session || ""}</div>
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

  const openAdminWhatsApp = (message) => {
    const waUrl = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(
      message
    )}`;
    window.open(waUrl, "_blank");
  };

  const buildUpiUrl = () => {
    const upiId = DEMO_UPI_ID;
    const payeeName = DEMO_PAYEE_NAME;
    // Keep QR minimal for better compatibility with strict UPI apps.
    return `upi://pay?pa=${encodeURIComponent(
      upiId
    )}&pn=${encodeURIComponent(payeeName)}&cu=INR`;
  };

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
    buildUpiUrl()
  )}`;

  const handleDownloadQr = async () => {
    setQrDownloading(true);
    try {
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      const filename = `fee-payment-qr-${student?.rollNo || "student"}.png`;
      const file = new File([blob], filename, { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Fee Payment QR",
          text: "Scan this QR to pay school fees."
        });
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      alert("QR downloaded. Check your Downloads/Gallery.");
    } catch (err) {
      console.error(err);
      alert("Could not download QR automatically. Long press on QR image and save.");
    } finally {
      setQrDownloading(false);
    }
  };

  const handleSubmitPaymentRequest = async () => {
    if (!student?.id || !exam?.id) return;
    const utr = utrInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!/^[A-Z0-9]{8,30}$/.test(utr)) {
      alert("Enter valid UTR/Ref number (8-30 letters/numbers).");
      return;
    }
    setPaymentSubmitting(true);
    try {
      const tr = makeUpiRefId();
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
      openAdminWhatsApp(
        `Hello Admin, I have paid my due amount.\nStudent: ${student.name}\nClass: ${student.class}${student.section ? ` (${student.section})` : ""}\nAmount: Rs ${request.amount}\nUTR: ${utr}\nPlease unlock my admit card.`
      );
      alert("Payment proof submitted. Waiting for admin verification.");
    } catch (err) {
      console.error(err);
      alert("Could not submit payment proof. Try again.");
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handlePayAtSchool = async () => {
    if (!student?.id || !exam?.id) return;
    setPaymentSubmitting(true);
    try {
      const request = {
        method: "pay_at_school",
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
      openAdminWhatsApp(
        `Hello Admin, I want to pay at school.\nStudent: ${student.name}\nClass: ${student.class}${student.section ? ` (${student.section})` : ""}\nDue Amount: Rs ${request.amount}\nPlease confirm and unlock my admit card after payment.`
      );
      alert("Request sent. Please pay at school and ask admin to verify.");
    } catch (err) {
      console.error(err);
      alert("Could not submit pay-at-school request.");
    } finally {
      setPaymentSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100">
        <ParentNavbar />
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
        <ParentNavbar />
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
    <>
    <div className="bg-slate-100 min-h-screen">
      <ParentNavbar />
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
                onPayAtSchool={handlePayAtSchool}
                onShowQr={() => setShowQr(true)}
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
                    onChange={(e) =>
                      setUtrInput(
                        e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
                      )
                    }
                    placeholder="Enter UTR / Ref No (Example: 123456789012)"
                    maxLength={30}
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
                <p className="mt-2 text-[11px] text-slate-500">
                  Enter only letters and numbers. No space or special characters.
                </p>
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
                    {paymentRequest.method && (
                      <p className="text-xs text-slate-500 mt-1">
                        Method: {paymentRequest.method.replaceAll("_", " ")}
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
    {showQr && (
      <div className="fixed inset-0 z-50 bg-slate-900/50 p-4 flex items-center justify-center">
        <div className="w-full max-w-sm bg-white rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-800">Scan QR to Pay</p>
            <button
              type="button"
              onClick={() => setShowQr(false)}
              className="text-slate-500 hover:text-slate-700 text-lg leading-none"
            >
              x
            </button>
          </div>
          <Image
            src={qrImageUrl}
            alt="UPI QR"
            width={256}
            height={256}
            unoptimized
            className="mx-auto h-64 w-64 rounded-lg border"
          />
          <p className="mt-3 text-xs text-slate-500 text-center">
            Amount: Rs {totalDue > 0 ? totalDue : 1}
          </p>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleDownloadQr();
            }}
            className="mt-3 block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-semibold"
          >
            {qrDownloading ? "Preparing..." : "Download QR"}
          </a>
        </div>
      </div>
    )}
    </>
  );
}

export default ParentDashboard;

