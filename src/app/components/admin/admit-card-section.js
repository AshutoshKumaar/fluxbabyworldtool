
"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "../../../lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc
} from "firebase/firestore";

const classOptions = ["UKG", "1", "2", "3", "4"];

const emptyRow = { day: "", date: "", subject: "" };
const dayOptions = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];
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

const toIsoDate = (value) => {
  if (!value) return "";
  const str = String(value).trim();
  if (!str) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [dd, mm, yyyy] = str.split("/");
    return `${yyyy}-${mm}-${dd}`;
  }
  return "";
};

const normalizeClassKey = (value) => {
  if (!value) return "";
  const str = String(value).toUpperCase();
  if (str.includes("UKG")) return "UKG";
  const match = str.match(/\d/);
  if (match) return match[0];
  return String(value).trim();
};

const formatClassSection = (student) => {
  if (!student) return "--";
  const cls = student.class || "--";
  const sec = student.section ? ` (${student.section})` : "";
  return `Class ${cls}${sec}`;
};

export default function AdmitCardSection({
  students,
  onFetchMonthlyFees
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [feeCache, setFeeCache] = useState({});
  const [loadingFees, setLoadingFees] = useState({});

  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [examName, setExamName] = useState("Annual Examination");
  const [session, setSession] = useState("2025-2026");
  const [reportingTime, setReportingTime] = useState("8:30 to 12:30");
  const [examCenter, setExamCenter] = useState("Flux Baby World Campus");
  const [examDate, setExamDate] = useState("");
  const [examTime, setExamTime] = useState("");
  const [savingExam, setSavingExam] = useState(false);

  const [scheduleByClass, setScheduleByClass] = useState({});
  const [scheduleDrafts, setScheduleDrafts] = useState({});
  const [selectedClass, setSelectedClass] = useState("UKG");
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleSaved, setScheduleSaved] = useState(false);
  const [toast, setToast] = useState(null);

  const [permissionMap, setPermissionMap] = useState({});
  const [savingPermission, setSavingPermission] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2200);
  };

  const filteredStudents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return students.filter((student) => {
      if (!term) return true;
      return (
        student.name?.toLowerCase().includes(term) ||
        String(student.rollNo || "").toLowerCase().includes(term) ||
        student.fatherName?.toLowerCase().includes(term)
      );
    });
  }, [students, searchTerm]);

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedId),
    [students, selectedId]
  );

  const getTotalDue = (fees = []) =>
    fees.reduce((sum, fee) => sum + Number(fee.dueFees || 0), 0);

  const ensureFees = async (studentId) => {
    if (!studentId || feeCache[studentId]) return;
    setLoadingFees((prev) => ({ ...prev, [studentId]: true }));
    const data = await onFetchMonthlyFees(studentId);
    setFeeCache((prev) => ({ ...prev, [studentId]: data }));
    setLoadingFees((prev) => ({ ...prev, [studentId]: false }));
  };

  const handleSelectStudent = async (studentId) => {
    setSelectedId(studentId);
    await ensureFees(studentId);
  };

  const fetchExams = async () => {
    const snap = await getDocs(collection(db, "exams"));
    const data = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    data.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
    setExams(data);
    if (!selectedExamId && data[0]) {
      setSelectedExamId(data[0].id);
    }
  };

  const fetchSchedules = async (examId) => {
    if (!examId) return;
    const snap = await getDocs(collection(db, "exams", examId, "schedules"));
    const map = {};
    snap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const rows = (data.rows || []).map((row) => ({
        ...row,
        date: toIsoDate(row.date)
      }));
      const className = data.className || normalizeClassKey(docSnap.id);
      map[className] = rows;
    });

    // Backward compatibility: ensure keys exist for all classes when older docs
    // were saved with non-normalized class names.
    for (const className of classOptions) {
      if (map[className]) continue;
      const legacyDoc = await getDoc(
        doc(db, "exams", examId, "schedules", className)
      );
      if (legacyDoc.exists()) {
        const rows = (legacyDoc.data()?.rows || []).map((row) => ({
          ...row,
          date: toIsoDate(row.date)
        }));
        map[className] = rows;
      }
    }

    setScheduleByClass(map);
    setScheduleDrafts(map);
  };

  const fetchPermissions = async (examId) => {
    if (!examId) return;
    const snap = await getDocs(
      collection(db, "exams", examId, "permissions")
    );
    const map = {};
    snap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      map[docSnap.id] = {
        allowDownload: !!data.allowDownload,
        issued: !!data.issued,
        paymentRequest: data.paymentRequest || null
      };
    });
    setPermissionMap(map);
  };

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (!selectedExamId) return;
    const exam = exams.find((item) => item.id === selectedExamId);
    if (exam) {
      setExamName(exam.examName || "Annual Examination");
      setSession(exam.session || "2025-2026");
      setReportingTime(exam.reportingTime || "8:30 to 12:30");
      setExamCenter(exam.examCenter || "Flux Baby World Campus");
      setExamDate(toIsoDate(exam.examDate || ""));
      setExamTime(exam.examTime || "");
    }
    fetchSchedules(selectedExamId);
    fetchPermissions(selectedExamId);
  }, [selectedExamId, exams]);

  const handleCreateExam = async () => {
    if (!examName || !session || !examDate || !examTime || !examCenter) {
      showToast("Fill all exam fields before creating a new exam.", "error");
      return;
    }
    setSavingExam(true);
    try {
      const docRef = await addDoc(collection(db, "exams"), {
        examName,
        session,
        reportingTime,
        examCenter,
        examDate: toIsoDate(examDate),
        examTime,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setSelectedExamId(docRef.id);
      await fetchExams();
      showToast("Exam created successfully.");
    } catch (err) {
      console.error(err);
      showToast("Could not create exam. Please try again.", "error");
    } finally {
      setSavingExam(false);
    }
  };

  const handleSaveExam = async () => {
    if (!selectedExamId) return;
    if (!examName || !session || !examDate || !examTime || !examCenter) {
      showToast("Fill all exam fields before saving.", "error");
      return;
    }
    setSavingExam(true);
    try {
      await setDoc(
        doc(db, "exams", selectedExamId),
        {
          examName,
          session,
          reportingTime,
          examCenter,
          examDate: toIsoDate(examDate),
          examTime,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      await fetchExams();
      showToast("Exam updated successfully.");
    } catch (err) {
      console.error(err);
      showToast("Could not save exam. Please try again.", "error");
    } finally {
      setSavingExam(false);
    }
  };

  const rowsForClass = scheduleDrafts[selectedClass] || [];

  const updateScheduleRow = (index, patch) => {
    setScheduleDrafts((prev) => {
      const next = { ...prev };
      const rows = [...(next[selectedClass] || [])];
      rows[index] = { ...rows[index], ...patch };
      next[selectedClass] = rows;
      return next;
    });
  };

  const addScheduleRow = () => {
    setScheduleDrafts((prev) => {
      const next = { ...prev };
      const rows = [...(next[selectedClass] || [])];
      rows.push({ ...emptyRow });
      next[selectedClass] = rows;
      return next;
    });
  };

  const removeScheduleRow = (index) => {
    setScheduleDrafts((prev) => {
      const next = { ...prev };
      const rows = [...(next[selectedClass] || [])];
      rows.splice(index, 1);
      next[selectedClass] = rows;
      return next;
    });
  };

  const saveSchedule = async () => {
    if (!selectedExamId) return;
    const rows = scheduleDrafts[selectedClass] || [];
    const hasInvalidRows = rows.some(
      (row) => !row.day || !toIsoDate(row.date) || !row.subject?.trim()
    );
    if (!rows.length || hasInvalidRows) {
      showToast("Each row needs day, date and subject.", "error");
      return;
    }
    setSavingSchedule(true);
    try {
      await setDoc(
        doc(db, "exams", selectedExamId, "schedules", selectedClass),
        {
          className: selectedClass,
          rows: rows.map((row) => ({
            day: row.day,
            date: toIsoDate(row.date),
            subject: row.subject.trim()
          })),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      await fetchSchedules(selectedExamId);
      setScheduleSaved(true);
      setTimeout(() => setScheduleSaved(false), 2000);
      showToast("Timetable saved.");
    } catch (err) {
      console.error(err);
      showToast("Could not save timetable. Please try again.", "error");
    } finally {
      setSavingSchedule(false);
    }
  };

  const togglePermission = async (studentId, allowDownload) => {
    if (!selectedExamId) return;
    setSavingPermission(true);
    try {
      await setDoc(
        doc(db, "exams", selectedExamId, "permissions", studentId),
        {
          allowDownload,
          issued: permissionMap[studentId]?.issued || false,
          paymentRequest: permissionMap[studentId]?.paymentRequest || null,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      setPermissionMap((prev) => ({
        ...prev,
        [studentId]: {
          allowDownload,
          issued: prev[studentId]?.issued || false,
          paymentRequest: prev[studentId]?.paymentRequest || null
        }
      }));
      showToast(
        allowDownload ? "Download permission enabled." : "Download permission removed."
      );
    } catch (err) {
      console.error(err);
      showToast("Could not update permission.", "error");
    } finally {
      setSavingPermission(false);
    }
  };

  const issueAdmitCard = async (studentId) => {
    if (!selectedExamId || !studentId) return;
    setSavingPermission(true);
    try {
      await setDoc(
        doc(db, "exams", selectedExamId, "permissions", studentId),
        {
          issued: true,
          issuedAt: serverTimestamp(),
          allowDownload: permissionMap[studentId]?.allowDownload || false,
          paymentRequest: permissionMap[studentId]?.paymentRequest || null,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      setPermissionMap((prev) => ({
        ...prev,
        [studentId]: {
          allowDownload: prev[studentId]?.allowDownload || false,
          issued: true,
          paymentRequest: prev[studentId]?.paymentRequest || null
        }
      }));
      showToast("Admit card issued for this student.");
    } catch (err) {
      console.error(err);
      showToast("Could not issue admit card.", "error");
    } finally {
      setSavingPermission(false);
    }
  };

  const verifyPaymentRequest = async (studentId, status) => {
    if (!selectedExamId || !studentId) return;
    const request = permissionMap[studentId]?.paymentRequest;
    if (!request) return;
    setSavingPermission(true);
    try {
      await setDoc(
        doc(db, "exams", selectedExamId, "permissions", studentId),
        {
          paymentRequest: {
            ...request,
            status,
            reviewedAt: serverTimestamp()
          },
          allowDownload:
            status === "verified"
              ? true
              : permissionMap[studentId]?.allowDownload || false,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      setPermissionMap((prev) => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          allowDownload:
            status === "verified" ? true : prev[studentId]?.allowDownload || false,
          paymentRequest: {
            ...request,
            status
          }
        }
      }));
      showToast(
        status === "verified"
          ? "Payment verified. Download unlocked."
          : "Payment request marked as rejected."
      );
    } catch (err) {
      console.error(err);
      showToast("Could not update payment request.", "error");
    } finally {
      setSavingPermission(false);
    }
  };

  const selectedFees = selectedId ? feeCache[selectedId] || [] : [];
  const totalDue = getTotalDue(selectedFees);
  const isPaid = totalDue <= 0;
  const allowDownload = permissionMap[selectedId]?.allowDownload || false;
  const issued = permissionMap[selectedId]?.issued || false;
  const paymentRequest = permissionMap[selectedId]?.paymentRequest || null;
  const canDownload = issued && (isPaid || allowDownload);
  const scheduleRows = selectedStudent
    ? scheduleByClass[normalizeClassKey(selectedStudent.class)] || []
    : [];

  const downloadAdmitCard = (student) => {
    if (!student) return;
    if (!canDownload) {
      showToast("Clear due or enable admin permission to download.", "error");
      return;
    }
    const win = window.open("", "_blank");
    if (!win) return;
    const examDateFormatted = formatDate(examDate);
    const rows = scheduleRows
      .map(
        (row) => `
          <tr>
            <td>${row.day}</td>
            <td>${formatDate(row.date)}</td>
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
                <div>Final Term Examination Date Sheet ${session}</div>
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
                    <div class="value">${examName}</div>
                  </div>
                  <div class="field">
                    <div class="label">Session</div>
                    <div class="value">${session}</div>
                  </div>
                  <div class="field">
                    <div class="label">Date</div>
                    <div class="value">${examDateFormatted}</div>
                  </div>
                  <div class="field">
                    <div class="label">Time</div>
                    <div class="value">${examTime || "--"}</div>
                  </div>
                  <div class="field" style="grid-column: span 2;">
                    <div class="label">Exam Center</div>
                    <div class="value">${examCenter}</div>
                  </div>
                </div>
              </div>

              <div class="note">Note: Reporting Timing: ${reportingTime}</div>
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
                <div>
                  <div class="sign-box">Principal Signature</div>
                </div>
                <div>
                  <div class="sign-box">Class Teacher Signature</div>
                </div>
                <div>
                  <div class="seal">School Seal</div>
                </div>
              </div>
            </div>
          </div>
          <script>
            window.onload = () => window.print();
          </script>
        </body>
      </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="card card-pad mt-8">
      {toast && (
        <div
          className={`fixed top-24 right-4 z-[60] text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg animate-[toastInOut_2.2s_ease-in-out] ${
            toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"
          }`}
        >
          {toast.message}
        </div>
      )}
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="w-full flex items-center justify-between text-left"
        aria-expanded={isOpen}
        aria-controls="admit-card-panel"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Admit Card Issuance
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Create exam schedules and manage admit card permissions
            </p>
          </div>
        </div>
        <span
          className={`inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition-transform duration-300 ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
          aria-hidden="true"
        >
          <svg
            className="h-5 w-5 text-slate-700"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M5 7.5l5 5 5-5" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      <div
        id="admit-card-panel"
        className={`overflow-hidden transition-[max-height,opacity,transform] duration-500 ${
          isOpen
            ? "max-h-[4000px] opacity-100 translate-y-0"
            : "max-h-0 opacity-0 -translate-y-2"
        }`}
      >
        <div className="mt-5 grid grid-cols-1 xl:grid-cols-[1fr_1.2fr] gap-6">
          <div className="stack-4">
            <div className="card-soft">
              <div className="flex items-center justify-between">
                <p className="card-title">
                  Exam Details
                </p>
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="h-9 border border-slate-200 rounded-lg px-2 text-xs text-slate-600"
                >
                  <option value="">Select Exam</option>
                  {exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.examName || "Exam"} ({exam.session || "Session"})
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  className="h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Exam Name"
                />
                <input
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  className="h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Session"
                />
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  value={examTime}
                  onChange={(e) => setExamTime(e.target.value)}
                  className="h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Time (e.g. 10:00 AM - 1:00 PM)"
                />
                <input
                  value={reportingTime}
                  onChange={(e) => setReportingTime(e.target.value)}
                  className="h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Reporting Time"
                />
                <input
                  value={examCenter}
                  onChange={(e) => setExamCenter(e.target.value)}
                  className="h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:col-span-2"
                  placeholder="Exam Center"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSaveExam}
                  className="px-4 py-2 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                  disabled={!selectedExamId || savingExam}
                >
                  {savingExam ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    "Save Exam"
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCreateExam}
                  className="px-4 py-2 rounded-lg text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                  disabled={savingExam}
                >
                  {savingExam ? "Saving..." : "Create New Exam"}
                </button>
              </div>
            </div>

            <div className="card-soft">
              <p className="card-title">
                Class Timetable
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {classOptions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setSelectedClass(item)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                      selectedClass === item
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    Class {item}
                  </button>
                ))}
              </div>
              <div className="mt-4 space-y-3 max-h-[340px] overflow-auto pr-1">
                {rowsForClass.map((row, index) => (
                  <div
                    key={`${row.day}-${index}`}
                    className="grid grid-cols-1 md:grid-cols-5 gap-2"
                  >
                    <select
                      value={row.day}
                      onChange={(e) =>
                        updateScheduleRow(index, { day: e.target.value })
                      }
                      className="h-10 border border-slate-200 rounded-lg px-3 text-sm w-full md:col-span-1"
                    >
                      <option value="">Day</option>
                      {dayOptions.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={toIsoDate(row.date)}
                      onChange={(e) =>
                        updateScheduleRow(index, { date: e.target.value })
                      }
                      className="h-10 border border-slate-200 rounded-lg px-3 text-sm w-full md:col-span-1"
                    />
                    <div className="flex flex-col sm:flex-row gap-2 md:col-span-3">
                      <input
                        value={row.subject}
                        onChange={(e) =>
                          updateScheduleRow(index, { subject: e.target.value })
                        }
                        className="h-10 flex-1 border border-slate-200 rounded-lg px-3 text-sm w-full"
                        placeholder="Subject"
                      />
                      <button
                        type="button"
                        onClick={() => removeScheduleRow(index)}
                        className="h-10 px-3 rounded-lg border border-rose-200 text-rose-600 text-sm w-full sm:w-auto"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                {rowsForClass.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No rows yet. Add first row below.
                  </p>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={addScheduleRow}
                  className="px-3 py-2 rounded-lg text-sm border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Add Row
                </button>
                <button
                  type="button"
                  onClick={saveSchedule}
                  className={`px-3 py-2 rounded-lg text-sm text-white hover:bg-emerald-700 disabled:opacity-60 ${
                    scheduleSaved ? "bg-indigo-600" : "bg-emerald-600"
                  }`}
                  disabled={!selectedExamId || savingSchedule}
                >
                  {savingSchedule ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Saving...
                    </span>
                  ) : scheduleSaved ? (
                    "Edit Timetable"
                  ) : (
                    "Save Timetable"
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="stack-4">
            <div className="card-soft">
              <div className="flex items-center justify-between">
                <p className="card-title">
                  Select Student
                </p>
                {selectedId && loadingFees[selectedId] && (
                  <span className="text-xs text-slate-500">Checking fees...</span>
                )}
              </div>
              <input
                placeholder="Search student"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-3 w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="mt-3 max-h-[300px] overflow-auto space-y-2 pr-1">
                {filteredStudents.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => handleSelectStudent(student.id)}
                    className={`w-full flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm ${
                      selectedId === student.id
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-slate-800">
                        {student.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatClassSection(student)} | Roll {student.rollNo}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400">Select</span>
                  </button>
                ))}
                {filteredStudents.length === 0 && (
                  <p className="text-sm text-slate-500">No students found.</p>
                )}
              </div>
            </div>

            <div className="card-soft">
              <p className="card-title">
                Admit Card Preview
              </p>
              {!selectedStudent ? (
                <div className="mt-4 text-sm text-slate-500">
                  Select a student to preview admit card.
                </div>
              ) : (
                <div className="mt-4 space-y-4 max-h-[620px] overflow-auto pr-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {selectedStudent.photoUrl ? (
                      <img
                        src={selectedStudent.photoUrl}
                        alt={selectedStudent.name}
                        className="h-16 w-16 rounded-2xl object-cover border"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center font-semibold">
                        {selectedStudent.name
                          ?.split(" ")
                          .map((part) => part[0])
                          .join("") || "S"}
                      </div>
                    )}
                    <div>
                      <p className="text-lg font-semibold text-slate-900">
                        {selectedStudent.name}
                      </p>
                      <p className="text-sm text-slate-500">
                        {formatClassSection(selectedStudent)} | Roll {selectedStudent.rollNo}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500">Exam</p>
                      <p className="font-semibold text-slate-800">{examName}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500">Session</p>
                      <p className="font-semibold text-slate-800">{session}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500">Date</p>
                      <p className="font-semibold text-slate-800">
                        {formatDate(examDate)}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500">Time</p>
                      <p className="font-semibold text-slate-800">
                        {examTime || "--"}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500">Reporting</p>
                      <p className="font-semibold text-slate-800">
                        {reportingTime || "--"}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 col-span-2">
                      <p className="text-xs text-slate-500">Exam Center</p>
                      <p className="font-semibold text-slate-800">{examCenter}</p>
                    </div>
                  </div>

                  <div className="card-soft">
                    <p className="card-title">
                      Class Time Table
                    </p>
                    <div className="mt-3 overflow-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                            <th className="border-b border-slate-200 pb-2">Day</th>
                            <th className="border-b border-slate-200 pb-2">Date</th>
                            <th className="border-b border-slate-200 pb-2">Subject</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scheduleRows.map((row, index) => (
                            <tr key={`${row.day}-${row.date}-${index}`}>
                              <td className="py-2 border-b border-slate-100">
                                {row.day}
                              </td>
                            <td className="py-2 border-b border-slate-100">
                              {formatDate(row.date)}
                            </td>
                              <td className="py-2 border-b border-slate-100">
                                {row.subject}
                              </td>
                            </tr>
                          ))}
                          {scheduleRows.length === 0 && (
                            <tr>
                              <td colSpan="4" className="py-3 text-slate-500 text-sm">
                                No timetable for this class.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                    <div>
                      <p className="text-xs text-slate-500">Total Due</p>
                      <p className="text-base font-semibold text-slate-800">
                        Rs {totalDue}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        isPaid
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {isPaid ? "Paid" : "Unpaid"}
                    </span>
                  </div>

                  {!isPaid && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                      Payment pending. Admit card will be available after dues
                      are cleared.
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => issueAdmitCard(selectedId)}
                      disabled={savingPermission || issued}
                      className="flex-1 border border-indigo-200 text-indigo-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-50 disabled:opacity-60"
                    >
                      {issued ? "Admit Card Issued" : "Issue Admit Card"}
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadAdmitCard(selectedStudent)}
                      disabled={!canDownload}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
                    >
                      Download Admit Card
                    </button>
                    <button
                      type="button"
                      className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50"
                    >
                      Pay Now (Demo)
                    </button>
                  </div>

                  {!issued && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                      Admin has not issued admit card yet.
                    </div>
                  )}

                  {!isPaid && (
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={allowDownload}
                        onChange={(e) =>
                          togglePermission(selectedId, e.target.checked)
                        }
                        disabled={savingPermission}
                      />
                      Allow download for this student (admin permission)
                    </label>
                  )}

                  {paymentRequest && (
                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-sm font-semibold text-slate-800">
                        Parent Payment Request
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        UTR: {paymentRequest.utr || "--"} | Amount: Rs{" "}
                        {paymentRequest.amount ?? 0}
                      </p>
                      <p className="text-xs text-slate-500">
                        Status:{" "}
                        <span
                          className={`font-semibold ${
                            paymentRequest.status === "verified"
                              ? "text-emerald-600"
                              : paymentRequest.status === "submitted"
                                ? "text-amber-600"
                                : "text-rose-600"
                          }`}
                        >
                          {paymentRequest.status || "submitted"}
                        </span>
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => verifyPaymentRequest(selectedId, "verified")}
                          disabled={
                            savingPermission || paymentRequest.status === "verified"
                          }
                          className="px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          Verify Payment
                        </button>
                        <button
                          type="button"
                          onClick={() => verifyPaymentRequest(selectedId, "rejected")}
                          disabled={savingPermission}
                          className="px-3 py-2 rounded-lg text-xs font-semibold border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="h-16 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-xs text-slate-400">
                      Principal Signature
                    </div>
                    <div className="h-16 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-xs text-slate-400">
                      Class Teacher Signature
                    </div>
                    <div className="h-16 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-xs text-slate-400">
                      School Seal
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

