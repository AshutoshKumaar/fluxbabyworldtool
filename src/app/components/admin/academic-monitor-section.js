"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc
} from "firebase/firestore";
import {
  BookOpenCheck,
  ChevronDown,
  ClipboardCheck,
  Copy,
  MapPin,
  QrCode,
  ShieldCheck,
  Users,
  Wifi
} from "lucide-react";
import { auth, db } from "../../../lib/firebase";

const toInputDate = (value = new Date()) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const titleCase = (value) =>
  String(value || "")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const normalizeClassName = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ");

  if (!normalized) return "";
  if (["pre nursery", "pre nur", "pre nur.", "pre-nursery", "prenursery"].includes(normalized)) {
    return "Pre Nursery";
  }
  if (normalized === "nursery") return "Nursery";
  if (normalized === "lkg") return "LKG";
  if (normalized === "ukg") return "UKG";
  if (normalized === "play" || normalized === "playgroup" || normalized === "play group") {
    return "Play";
  }

  const numeric = normalized.match(/^0*(\d+)$/);
  if (numeric) return String(Number(numeric[1]));

  return titleCase(normalized);
};

const normalizeSectionName = (value) => String(value || "").trim().toUpperCase();

const classSectionKey = (className, section) =>
  `${normalizeClassName(className)}__${normalizeSectionName(section)}`;

const formatClassGroup = (key) => {
  const [rawClassName = "", rawSectionName = ""] = String(key || "").split("__");
  const className = normalizeClassName(rawClassName);
  const sectionName = normalizeSectionName(rawSectionName);
  if (!className) return "Unassigned";
  return `Class ${className}${sectionName ? ` (${sectionName})` : ""}`;
};

const formatDateTime = (value) => {
  const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const makeAttendanceCode = () => {
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  const timePart = Date.now().toString().slice(-4);
  return `FBW${randomPart}${timePart}`.slice(0, 16);
};

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-sm ${accent}`}
        >
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

export default function AcademicMonitorSection({
  students = [],
  isOpen: controlledIsOpen,
  onToggle
}) {
  const [localIsOpen, setLocalIsOpen] = useState(false);
  const isOpen =
    typeof controlledIsOpen === "boolean" ? controlledIsOpen : localIsOpen;
  const handleSectionToggle = () => {
    if (typeof onToggle === "function") {
      onToggle();
      return;
    }
    setLocalIsOpen((prev) => !prev);
  };
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [teacherAttendanceItems, setTeacherAttendanceItems] = useState([]);
  const [homeworkItems, setHomeworkItems] = useState([]);
  const [studentAttendanceItems, setStudentAttendanceItems] = useState([]);
  const [selectedDate, setSelectedDate] = useState(toInputDate(new Date()));
  const [teacherSummaryMonth, setTeacherSummaryMonth] = useState(
    toInputDate(new Date()).slice(0, 7)
  );
  const [selectedClassKey, setSelectedClassKey] = useState("");
  const [policySaving, setPolicySaving] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    enforceGeo: true,
    requireQr: true,
    schoolLatitude: "",
    schoolLongitude: "",
    radiusMeters: "150",
    schoolWifiName: "",
    officeQrCode: ""
  });

  const availableGroups = useMemo(() => {
    const map = new Map();
    students.forEach((student) => {
      const className = normalizeClassName(student.class);
      const sectionName = normalizeSectionName(student.section);
      if (!className) return;
      const key = classSectionKey(className, sectionName);
      if (!key || map.has(key)) return;
      map.set(key, {
        key,
        label: formatClassGroup(key)
      });
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [students]);

  const fetchAcademicData = async () => {
    setLoading(true);
    try {
      const [teacherAttendanceSnap, homeworkSnap, studentAttendanceSnap, policySnap] =
        await Promise.all([
          getDocs(collection(db, "teacherAttendance")),
          getDocs(collection(db, "homework")),
          getDocs(collection(db, "studentAttendance")),
          getDoc(doc(db, "settings", "teacherAttendancePolicy"))
        ]);

      const teacherAttendanceData = teacherAttendanceSnap.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => {
          const statusOrder = { pending: 0, rejected: 1, verified: 2 };
          const statusDiff =
            (statusOrder[a.verificationStatus || "pending"] ?? 0) -
            (statusOrder[b.verificationStatus || "pending"] ?? 0);
          if (statusDiff !== 0) return statusDiff;
          return String(b.date || "").localeCompare(String(a.date || ""));
        });

      const homeworkData = homeworkSnap.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });

      const studentAttendanceData = studentAttendanceSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      setTeacherAttendanceItems(teacherAttendanceData);
      setHomeworkItems(homeworkData);
      setStudentAttendanceItems(studentAttendanceData);
      if (policySnap.exists()) {
        const data = policySnap.data();
        setPolicyForm({
          enforceGeo: data.enforceGeo !== false,
          requireQr: data.requireQr !== false,
          schoolLatitude: String(data.schoolLatitude ?? ""),
          schoolLongitude: String(data.schoolLongitude ?? ""),
          radiusMeters: String(data.radiusMeters ?? "150"),
          schoolWifiName: data.schoolWifiName || "",
          officeQrCode: data.officeQrCode || data.dailyQrCode || ""
        });
      }
    } catch (err) {
      console.error(err);
      setTeacherAttendanceItems([]);
      setHomeworkItems([]);
      setStudentAttendanceItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcademicData();
  }, []);

  useEffect(() => {
    if (!selectedClassKey && availableGroups[0]?.key) {
      setSelectedClassKey(availableGroups[0].key);
    }
  }, [availableGroups, selectedClassKey]);

  const pendingTeacherAttendance = useMemo(
    () =>
      teacherAttendanceItems.filter(
        (item) => (item.verificationStatus || "pending") === "pending"
      ),
    [teacherAttendanceItems]
  );

  const teacherMonthlySummary = useMemo(() => {
    const summaryMap = new Map();

    teacherAttendanceItems
      .filter((item) => String(item.date || "").startsWith(teacherSummaryMonth))
      .forEach((item) => {
        const key = item.teacherId || item.teacherName || item.id;
        if (!summaryMap.has(key)) {
          summaryMap.set(key, {
            teacherId: item.teacherId || "",
            teacherName: item.teacherName || "Teacher",
            present: 0,
            late: 0,
            leave: 0,
            pending: 0,
            rejected: 0,
            total: 0
          });
        }

        const row = summaryMap.get(key);
        row.total += 1;

        if (item.verificationStatus === "verified") {
          if (item.status === "present") row.present += 1;
          else if (item.status === "late") row.late += 1;
          else if (item.status === "leave") row.leave += 1;
        } else if (item.verificationStatus === "pending") {
          row.pending += 1;
        } else if (item.verificationStatus === "rejected") {
          row.rejected += 1;
        }
      });

    return Array.from(summaryMap.values()).sort((a, b) =>
      a.teacherName.localeCompare(b.teacherName)
    );
  }, [teacherAttendanceItems, teacherSummaryMonth]);

  const filteredHomework = useMemo(() => {
    return homeworkItems.filter((item) => {
      const classMatch = !selectedClassKey
        ? true
        : classSectionKey(item.className, item.sectionName) === selectedClassKey;
      if (!classMatch) return false;

      if (!selectedDate) return true;
      const createdDate = item.createdAt?.toDate?.()
        ? toInputDate(item.createdAt.toDate())
        : "";
      return createdDate ? createdDate === selectedDate : true;
    });
  }, [homeworkItems, selectedClassKey, selectedDate]);

  const selectedAttendanceDoc = useMemo(
    () =>
      studentAttendanceItems.find(
        (item) =>
          String(item.date || "") === selectedDate &&
          classSectionKey(item.className, item.sectionName) === selectedClassKey
      ) || null,
    [selectedClassKey, selectedDate, studentAttendanceItems]
  );

  const selectedClassStudents = useMemo(
    () =>
      students.filter(
        (student) =>
          classSectionKey(student.class, student.section) === selectedClassKey
      ),
    [selectedClassKey, students]
  );

  const attendanceSummary = useMemo(() => {
    const records = selectedAttendanceDoc?.records || {};
    const values = Object.values(records);
    const present = values.filter(
      (item) => item.status === "present" || item.status === "late"
    ).length;
    const absent = values.filter((item) => item.status === "absent").length;
    const leave = values.filter((item) => item.status === "leave").length;
    const total = selectedClassStudents.length || values.length;
    return {
      total,
      marked: values.length,
      present,
      absent,
      leave,
      presentPct: total ? Math.round((present / total) * 100) : 0,
      absentPct: total ? Math.round((absent / total) * 100) : 0
    };
  }, [selectedAttendanceDoc, selectedClassStudents.length]);

  const qrPayload = useMemo(() => {
    if (!policyForm.officeQrCode) return "";
    return `FBW-TEACHER-ATTENDANCE|OFFICE|${policyForm.officeQrCode}`;
  }, [policyForm.officeQrCode]);

  const qrImageUrl = qrPayload
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
        qrPayload
      )}`
    : "";

  const savePolicy = async () => {
    setPolicySaving(true);
    try {
      await setDoc(
        doc(db, "settings", "teacherAttendancePolicy"),
        {
          enforceGeo: policyForm.enforceGeo,
          requireQr: policyForm.requireQr,
          schoolLatitude: Number(policyForm.schoolLatitude || 0),
          schoolLongitude: Number(policyForm.schoolLongitude || 0),
          radiusMeters: Number(policyForm.radiusMeters || 150),
          schoolWifiName: policyForm.schoolWifiName || "",
          officeQrCode: policyForm.officeQrCode || "",
          updatedAt: serverTimestamp(),
          updatedBy: auth.currentUser?.uid || ""
        },
        { merge: true }
      );
      alert("Teacher attendance policy saved.");
    } catch (err) {
      console.error(err);
      alert("Could not save teacher attendance policy.");
    } finally {
      setPolicySaving(false);
    }
  };

  const handleCopyCode = async () => {
    if (!policyForm.officeQrCode) return;
    try {
      await navigator.clipboard.writeText(policyForm.officeQrCode);
      alert("Attendance code copied.");
    } catch (err) {
      console.error(err);
      alert("Could not copy attendance code.");
    }
  };

  const updateTeacherAttendanceStatus = async (record, status) => {
    if (!record?.id) return;
    setActionId(record.id);
    try {
      await setDoc(
        doc(db, "teacherAttendance", record.id),
        {
          verificationStatus: status,
          verificationLabel:
            status === "verified" ? "Verified by Admin" : "Rejected by Admin",
          verifiedBy: auth.currentUser?.uid || "",
          verifiedAt: serverTimestamp()
        },
        { merge: true }
      );

      setTeacherAttendanceItems((prev) =>
        prev.map((item) =>
          item.id === record.id
            ? {
                ...item,
                verificationStatus: status,
                verificationLabel:
                  status === "verified" ? "Verified by Admin" : "Rejected by Admin"
              }
            : item
        )
      );
    } catch (err) {
      console.error(err);
      alert("Could not update teacher attendance verification.");
    } finally {
      setActionId("");
    }
  };

  return (
    <div className="card-soft mt-5 overflow-hidden rounded-[30px] border-slate-200/80 shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-200/60">
            <ShieldCheck size={22} />
          </div>
          <div className="space-y-2">
            <div>
              <h2 className="text-[1.85rem] font-bold leading-tight text-slate-900 sm:text-[2rem]">
                Academic Monitoring
              </h2>
              <p className="mt-1 text-sm text-slate-500 sm:text-[15px]">
                Review teacher attendance, class homework, and student attendance reports from one place.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700">
                {pendingTeacherAttendance.length} pending reviews
              </span>
              <span className="rounded-full bg-violet-50 px-3 py-1 font-semibold text-violet-700">
                {homeworkItems.length} homework posts
              </span>
              <span className="rounded-full bg-sky-50 px-3 py-1 font-semibold text-sky-700">
                {studentAttendanceItems.length} reports
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSectionToggle}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700"
          aria-label={isOpen ? "Collapse Academic Monitoring section" : "Expand Academic Monitoring section"}
        >
          <ChevronDown
            className={`h-5 w-5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {isOpen && (
        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-4 text-sm text-cyan-800">
            <p className="font-semibold text-cyan-900">How Office QR attendance works</p>
            <p className="mt-1 text-sm leading-6">
              This section is for admin and office only. Admin saves the fixed office QR here, school location is checked from here, and teachers only scan this same office QR from their own dashboard. After scanning plus location verification, the attendance still comes here first as pending and becomes final only after admin approval.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={ShieldCheck}
              label="Pending Teacher Verification"
              value={pendingTeacherAttendance.length}
              accent="bg-gradient-to-br from-amber-500 to-orange-500"
            />
            <StatCard
              icon={BookOpenCheck}
              label="Homework Posts"
              value={homeworkItems.length}
              accent="bg-gradient-to-br from-violet-500 to-indigo-600"
            />
            <StatCard
              icon={ClipboardCheck}
              label="Attendance Reports"
              value={studentAttendanceItems.length}
              accent="bg-gradient-to-br from-sky-500 to-blue-600"
            />
            <StatCard
              icon={Users}
              label="Tracked Class Groups"
              value={availableGroups.length}
              accent="bg-gradient-to-br from-emerald-500 to-teal-600"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
            <div className="card-soft">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="card-title">Teacher Attendance Verification</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Teacher self-attendance stays pending until admin verifies it.
                  </p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  {pendingTeacherAttendance.length} pending
                </span>
              </div>

              <div className="mt-4 max-h-[520px] space-y-3 overflow-auto pr-1">
                {teacherAttendanceItems.map((item) => {
                  const isFinal =
                    item.verificationStatus === "verified" ||
                    item.verificationStatus === "rejected";
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {item.teacherName || "Teacher"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Date {item.date || "--"} | Status {item.status || "--"}
                          </p>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            item.verificationStatus === "verified"
                              ? "bg-emerald-100 text-emerald-700"
                              : item.verificationStatus === "rejected"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {item.verificationLabel ||
                            (item.verificationStatus === "verified"
                              ? "Verified by Admin"
                              : item.verificationStatus === "rejected"
                                ? "Rejected by Admin"
                                : "Pending Admin Review")}
                        </span>
                      </div>

                      {item.note && (
                        <p className="mt-3 text-sm text-slate-600">{item.note}</p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        {item.qrCode && (
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                            QR: {item.qrCode}
                          </span>
                        )}
                        {item.expectedWifiName && (
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                            Wi-Fi: {item.expectedWifiName}
                          </span>
                        )}
                        {item.geoCheck?.checked && (
                          <span
                            className={`rounded-full border px-2.5 py-1 ${
                              item.geoCheck?.withinRadius
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-rose-200 bg-rose-50 text-rose-700"
                            }`}
                          >
                            Geo {item.geoCheck?.withinRadius ? "within radius" : "outside radius"}
                            {item.geoCheck?.distanceMeters || item.geoCheck?.distanceMeters === 0
                              ? ` · ${item.geoCheck.distanceMeters} m`
                              : ""}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        {item.updatedAt && (
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                            Submitted {formatDateTime(item.updatedAt)}
                          </span>
                        )}
                        {item.verifiedAt && (
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                            Reviewed {formatDateTime(item.verifiedAt)}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => updateTeacherAttendanceStatus(item, "verified")}
                          disabled={isFinal || actionId === item.id}
                          className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {actionId === item.id ? "Updating..." : "Verify"}
                        </button>
                        <button
                          type="button"
                          onClick={() => updateTeacherAttendanceStatus(item, "rejected")}
                          disabled={isFinal || actionId === item.id}
                          className="rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}

                {!loading && teacherAttendanceItems.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No teacher attendance submissions yet.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="card-soft">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="card-title">Teacher Monthly Summary</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Admin can review month-wise teacher attendance totals after verification.
                    </p>
                  </div>
                  <div className="min-w-[180px]">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Summary Month
                    </label>
                    <input
                      type="month"
                      value={teacherSummaryMonth}
                      onChange={(e) => setTeacherSummaryMonth(e.target.value)}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div className="mt-4 max-h-[320px] space-y-3 overflow-auto pr-1">
                  {teacherMonthlySummary.map((item) => (
                    <div
                      key={item.teacherId || item.teacherName}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{item.teacherName}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Total submissions this month: {item.total}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-700">
                            Present {item.present}
                          </span>
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-700">
                            Late {item.late}
                          </span>
                          <span className="rounded-full bg-cyan-100 px-2.5 py-1 font-semibold text-cyan-700">
                            Leave {item.leave}
                          </span>
                          <span className="rounded-full bg-violet-100 px-2.5 py-1 font-semibold text-violet-700">
                            Pending {item.pending}
                          </span>
                          <span className="rounded-full bg-rose-100 px-2.5 py-1 font-semibold text-rose-700">
                            Rejected {item.rejected}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {!loading && teacherMonthlySummary.length === 0 && (
                    <p className="text-sm text-slate-500">
                      No teacher attendance records found for the selected month.
                    </p>
                  )}
                </div>
              </div>

              <div className="card-soft">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="card-title">Office QR & Attendance Security</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Admin sets the school location and the one-time office QR here. Teachers do not generate QR here; they only scan it from the teacher dashboard.
                    </p>
                  </div>
                  <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                    QR + Geo policy
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={policyForm.enforceGeo}
                      onChange={(e) =>
                        setPolicyForm((prev) => ({ ...prev, enforceGeo: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    Enforce geolocation radius
                  </label>
                  <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={policyForm.requireQr}
                      onChange={(e) =>
                        setPolicyForm((prev) => ({ ...prev, requireQr: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    Require office QR / code
                  </label>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      School Latitude
                    </label>
                    <input
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      value={policyForm.schoolLatitude}
                      onChange={(e) =>
                        setPolicyForm((prev) => ({ ...prev, schoolLatitude: e.target.value }))
                      }
                      placeholder="25.5400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      School Longitude
                    </label>
                    <input
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      value={policyForm.schoolLongitude}
                      onChange={(e) =>
                        setPolicyForm((prev) => ({ ...prev, schoolLongitude: e.target.value }))
                      }
                      placeholder="87.5600"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Radius (meters)
                    </label>
                    <input
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      value={policyForm.radiusMeters}
                      onChange={(e) =>
                        setPolicyForm((prev) => ({ ...prev, radiusMeters: e.target.value }))
                      }
                      placeholder="150"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Expected School Wi-Fi
                    </label>
                    <input
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      value={policyForm.schoolWifiName}
                      onChange={(e) =>
                        setPolicyForm((prev) => ({ ...prev, schoolWifiName: e.target.value }))
                      }
                      placeholder="FluxSchool-WiFi"
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[0.65fr_0.35fr]">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Office QR / Code Setup
                      </label>
                      <div className="flex gap-2">
                        <input
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          value={policyForm.officeQrCode}
                          onChange={(e) =>
                            setPolicyForm((prev) => ({ ...prev, officeQrCode: e.target.value.toUpperCase() }))
                          }
                          placeholder="OFFICEQR2026"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setPolicyForm((prev) => ({
                              ...prev,
                              officeQrCode: makeAttendanceCode()
                            }))
                          }
                          className="rounded-2xl border border-cyan-200 bg-white px-4 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-50"
                        >
                          Generate
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyCode}
                          disabled={!policyForm.officeQrCode}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          <Copy size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1">
                        <MapPin size={13} />
                        Geo gate {policyForm.enforceGeo ? "enabled" : "disabled"}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1">
                        <QrCode size={13} />
                        QR gate {policyForm.requireQr ? "enabled" : "disabled"}
                      </span>
                      {policyForm.schoolWifiName && (
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1">
                          <Wifi size={13} />
                          Expected Wi-Fi: {policyForm.schoolWifiName}
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      Browser apps cannot reliably read the connected Wi-Fi SSID. So the real control is office QR plus school location. Teachers must scan the office QR from their own panel before attendance submission.
                    </p>

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={savePolicy}
                        disabled={policySaving}
                        className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white hover:from-cyan-600 hover:to-blue-700 disabled:opacity-60"
                      >
                        {policySaving ? "Saving..." : "Save Attendance Policy"}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      Office Attendance QR for Teachers
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Print this or paste it in the school office. Teachers scan this same QR from the teacher panel while standing inside campus.
                    </p>
                    {qrImageUrl ? (
                      <Image
                        src={qrImageUrl}
                        alt="Teacher attendance QR"
                        width={176}
                        height={176}
                        unoptimized
                        className="mx-auto mt-3 h-44 w-44 rounded-2xl border border-slate-200 bg-white p-2"
                      />
                    ) : (
                      <div className="mt-3 flex h-44 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-400">
                        Generate office QR code
                      </div>
                    )}
                    <p className="mt-3 text-center text-xs font-semibold tracking-[0.18em] text-slate-500">
                      {policyForm.officeQrCode || "NO CODE"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card-soft">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[220px] flex-1">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Class Group
                    </label>
                    <select
                      value={selectedClassKey}
                      onChange={(e) => setSelectedClassKey(e.target.value)}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      {availableGroups.map((group) => (
                        <option key={group.key} value={group.key}>
                          {group.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-[180px]">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Report Date
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>
              </div>

              <div className="card-soft">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="card-title">Student Attendance Report</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Daily class-wise summary for admin review and follow-up.
                    </p>
                  </div>
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                    {formatClassGroup(selectedClassKey)}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">
                      Present
                    </p>
                    <p className="mt-2 text-2xl font-bold text-emerald-700">
                      {attendanceSummary.present}
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">
                      {attendanceSummary.presentPct}% of class
                    </p>
                  </div>
                  <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-600">
                      Absent
                    </p>
                    <p className="mt-2 text-2xl font-bold text-rose-700">
                      {attendanceSummary.absent}
                    </p>
                    <p className="mt-1 text-xs text-rose-700">
                      {attendanceSummary.absentPct}% of class
                    </p>
                  </div>
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">
                      Leave
                    </p>
                    <p className="mt-2 text-2xl font-bold text-amber-700">
                      {attendanceSummary.leave}
                    </p>
                    <p className="mt-1 text-xs text-amber-700">marked leave</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Marked / Total
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-800">
                      {attendanceSummary.marked}/{attendanceSummary.total}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">students</p>
                  </div>
                </div>

                {!selectedAttendanceDoc && (
                  <p className="mt-4 text-sm text-slate-500">
                    No student attendance record found for the selected date and class group.
                  </p>
                )}
              </div>

              <div className="card-soft">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="card-title">Class-wise Homework Feed</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Admin can review what homework is being sent to each class on the selected day.
                    </p>
                  </div>
                  <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                    {filteredHomework.length} visible
                  </span>
                </div>

                <div className="mt-4 max-h-[360px] space-y-3 overflow-auto pr-1">
                  {filteredHomework.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{item.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatClassGroup(classSectionKey(item.className, item.sectionName))} |{" "}
                            {item.subject || "--"} | {item.teacherName || "--"}
                          </p>
                        </div>
                        <div className="rounded-full border border-violet-100 bg-white px-3 py-1 text-xs font-semibold text-violet-700">
                          Due {item.dueDate || "--"}
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {item.description}
                      </p>
                      <p className="mt-3 text-xs text-slate-500">
                        Posted {formatDateTime(item.createdAt)}
                      </p>
                    </div>
                  ))}
                  {!loading && filteredHomework.length === 0 && (
                    <p className="text-sm text-slate-500">
                      No homework found for the selected class group.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
