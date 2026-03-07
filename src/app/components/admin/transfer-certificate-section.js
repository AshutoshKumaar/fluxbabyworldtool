"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { db } from "../../../lib/firebase";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import {
  buildTransferCertificateHtml,
  getDefaultTransferCertificate,
  getTcRows,
  TC_SCHOOL
} from "../../../lib/transfer-certificate";

const fieldClass =
  "h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500";

const textareaClass =
  "min-h-[96px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500";

const panelClass =
  "rounded-[28px] border border-slate-200 bg-white/95 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]";

function ChevronIcon({ isOpen }) {
  return (
    <svg
      className={`h-5 w-5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M8 3.75H13.5L18.25 8.5V19a1.75 1.75 0 0 1-1.75 1.75H8A1.75 1.75 0 0 1 6.25 19V5.5A1.75 1.75 0 0 1 8 3.75Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.25 3.75V8.75H18.25"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.25 12H15.25M9.25 15.5H15.25"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function TransferCertificateSection({ students }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState(getDefaultTransferCertificate());
  const [saving, setSaving] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [savedAt, setSavedAt] = useState("");

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

  useEffect(() => {
    if (!selectedId && students[0]?.id) {
      setSelectedId(students[0].id);
    }
  }, [students, selectedId]);

  useEffect(() => {
    const loadTc = async () => {
      if (!selectedStudent?.id) return;
      setLoadingDoc(true);
      setSavedAt("");
      try {
        const tcRef = doc(db, "transferCertificates", selectedStudent.id);
        const snap = await getDoc(tcRef);
        const defaults = getDefaultTransferCertificate(selectedStudent);
        if (snap.exists()) {
          setForm({
            ...defaults,
            ...snap.data()
          });
          setSavedAt(
            snap.data()?.updatedAt?.toDate?.().toLocaleString("en-IN") || ""
          );
        } else {
          setForm(defaults);
        }
      } catch (err) {
        console.error(err);
        setForm(getDefaultTransferCertificate(selectedStudent));
      } finally {
        setLoadingDoc(false);
      }
    };

    loadTc();
  }, [selectedStudent]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveTc = async () => {
    if (!selectedStudent?.id) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, "transferCertificates", selectedStudent.id),
        {
          ...form,
          studentId: selectedStudent.id,
          studentName: selectedStudent.name || "",
          studentClass: selectedStudent.class || "",
          studentSection: selectedStudent.section || "",
          rollNo: selectedStudent.rollNo || "",
          photoUrl: selectedStudent.photoUrl || "",
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      setSavedAt(new Date().toLocaleString("en-IN"));
      alert("Transfer Certificate saved.");
    } catch (err) {
      console.error(err);
      alert("Could not save Transfer Certificate.");
    } finally {
      setSaving(false);
    }
  };

  const downloadTc = () => {
    if (!selectedStudent?.id) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.open();
    win.document.write(
      buildTransferCertificateHtml({
        ...form,
        pupilName: form.pupilName || selectedStudent.name || "",
        motherName: form.motherName || selectedStudent.motherName || "",
        fatherName: form.fatherName || selectedStudent.fatherName || "",
        dateOfBirth: form.dateOfBirth || selectedStudent.dob || ""
      })
    );
    win.document.close();
  };

  return (
    <div className="card-soft mt-6 overflow-hidden">
      <div className="flex items-start justify-between gap-4 py-1 px-1">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow">
            <DocumentIcon />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Transfer Certificate
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Create, save and print dynamic TC records for students.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 mr-3"
          aria-label={
            isOpen
              ? "Collapse Transfer Certificate section"
              : "Expand Transfer Certificate section"
          }
        >
          <ChevronIcon isOpen={isOpen} />
        </button>
      </div>

      {isOpen && (
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            <div className={panelClass}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="card-title">Select Student</p>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                  Total {filteredStudents.length}
                </span>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search student by name, roll, father name"
                className="mt-4 h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <div className="mt-4 max-h-[300px] overflow-auto space-y-2 pr-1">
                {filteredStudents.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => setSelectedId(student.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      selectedId === student.id
                        ? "border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50 shadow-[0_12px_30px_rgba(245,158,11,0.10)]"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <p className="font-semibold text-slate-800">{student.name}</p>
                    <p className="text-xs text-slate-500">
                      Class {student.class || "--"}
                      {student.section ? ` (${student.section})` : ""} | Roll{" "}
                      {student.rollNo || "--"}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className={panelClass}>
              <div className="flex items-center justify-between gap-3">
                <p className="card-title">TC Preview</p>
                {savedAt && (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Saved: {savedAt}
                  </span>
                )}
              </div>
              {selectedStudent ? (
                <div className="mt-4 rounded-[26px] border border-slate-200 bg-white p-4 shadow-inner">
                  <div className="mb-4 flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-3">
                    {selectedStudent.photoUrl ? (
                      <img
                        src={selectedStudent.photoUrl}
                        alt={selectedStudent.name}
                        className="h-14 w-14 rounded-2xl border border-slate-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-lg font-bold text-amber-700">
                        {selectedStudent.name?.[0] || "S"}
                      </div>
                    )}
                    <div>
                      <p className="text-base font-semibold text-slate-900">
                        {selectedStudent.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Class {selectedStudent.class || "--"}
                        {selectedStudent.section
                          ? ` (${selectedStudent.section})`
                          : ""}{" "}
                        | Roll {selectedStudent.rollNo || "--"}
                      </p>
                    </div>
                  </div>

                  <div className="border-b border-slate-200 pb-3 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <Image
                        src="/logo.png"
                        alt="Flux Baby World logo"
                        width={42}
                        height={42}
                        className="h-10 w-10 object-contain"
                      />
                      <div>
                        <p className="text-xs font-semibold text-slate-500">
                          {TC_SCHOOL.regNo}
                        </p>
                        <p className="text-2xl font-extrabold text-amber-700">
                          {TC_SCHOOL.name}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      {TC_SCHOOL.address}
                    </p>
                    <p className="text-xs text-slate-500">
                      Email - {TC_SCHOOL.email} | Phone - {TC_SCHOOL.phone}
                    </p>
                    <p className="mt-2 text-sm font-bold tracking-[0.25em] text-slate-800">
                      TRANSFER CERTIFICATE
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 text-xs font-semibold text-slate-600">
                    <span>
                      TC No. {form.tcNo || "--"} / Session {form.session || "--"}
                    </span>
                    <span>Admission No. {form.admissionNo || "--"}</span>
                  </div>

                  <div className="mt-3 max-h-[420px] overflow-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-sm">
                      <tbody>
                        {getTcRows(form).map(([label, value]) => (
                          <tr key={label} className="border-b border-slate-100">
                            <td className="w-[46%] px-3 py-2 font-semibold text-slate-600 align-top">
                              {label}
                            </td>
                            <td className="px-3 py-2 text-slate-800">
                              {value || "--"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-3 text-center">
                      <p className="text-2xl text-blue-700" style={{ fontFamily: "cursive" }}>
                        Gyanvi
                      </p>
                      <p className="text-[11px] font-semibold text-slate-500">
                        Principal
                      </p>
                    </div>
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-3 text-center">
                      <p className="text-2xl text-blue-700" style={{ fontFamily: "cursive" }}>
                        Monika Singh
                      </p>
                      <p className="text-[11px] font-semibold text-slate-500">
                        MD
                      </p>
                    </div>
                    <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-3 text-center text-xs text-slate-400">
                      School Seal
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  Select a student to preview the certificate.
                </p>
              )}
            </div>
          </div>

          <div className={panelClass}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="card-title">TC Details Form</p>
                <p className="mt-1 text-xs text-slate-500">
                  Dynamic student fields with editable transfer certificate details.
                </p>
              </div>
              {loadingDoc && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                  Loading saved TC...
                </span>
              )}
            </div>

            {selectedStudent ? (
              <>
                <div className="mt-4 rounded-[24px] border border-amber-100 bg-gradient-to-r from-amber-50 via-white to-orange-50 px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      {selectedStudent.photoUrl ? (
                        <img
                          src={selectedStudent.photoUrl}
                          alt={selectedStudent.name}
                          className="h-14 w-14 rounded-2xl border border-white object-cover shadow-sm"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-lg font-bold text-amber-700 shadow-sm">
                          {selectedStudent.name?.[0] || "S"}
                        </div>
                      )}
                      <div>
                        <p className="text-base font-bold text-slate-900">
                          {selectedStudent.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          Dynamic student profile linked to this TC
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs sm:min-w-[220px]">
                      <div className="rounded-2xl bg-white px-3 py-2">
                        <p className="text-slate-400">Class</p>
                        <p className="font-semibold text-slate-700">
                          {selectedStudent.class || "--"}
                          {selectedStudent.section
                            ? ` (${selectedStudent.section})`
                            : ""}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-2">
                        <p className="text-slate-400">Roll</p>
                        <p className="font-semibold text-slate-700">
                          {selectedStudent.rollNo || "--"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      TC No
                    </label>
                    <input
                      className={fieldClass}
                      value={form.tcNo || ""}
                      onChange={(e) => updateField("tcNo", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Session
                    </label>
                    <input
                      className={fieldClass}
                      value={form.session || ""}
                      onChange={(e) => updateField("session", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Admission No
                    </label>
                    <input
                      className={fieldClass}
                      value={form.admissionNo || ""}
                      onChange={(e) => updateField("admissionNo", e.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {[
                    ["pupilName", "Name of pupil"],
                    ["motherName", "Mother's name"],
                    ["fatherName", "Father's name"],
                    ["nationality", "Nationality"],
                    ["religion", "Religion"],
                    ["category", "SC/ST/OBC Category"],
                    ["admissionClass", "Admission class"],
                    ["lastClassStudied", "Last class studied"],
                    ["lastExamResult", "Last examination result"],
                    ["failedInSameClass", "Failed once/twice"],
                    ["qualifiedForPromotion", "Qualified for promotion"],
                    ["promotedToClass", "Promoted to class"],
                    ["duesPaidUpto", "Dues paid upto month"],
                    ["feeConcession", "Fee concession"],
                    ["workingDays", "Working days"],
                    ["presentDays", "Present days"],
                    ["nccScout", "NCC/Boy scout"],
                    ["conduct", "General conduct"],
                    ["leavingReason", "Reason for leaving"]
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {label}
                      </label>
                      <input
                        className={fieldClass}
                        value={form[key] || ""}
                        onChange={(e) => updateField(key, e.target.value)}
                      />
                    </div>
                  ))}

                  {[
                    ["dateOfBirth", "Date of birth"],
                    ["admissionDate", "Admission date"],
                    ["applicationDate", "Application date"],
                    ["issueDate", "Issue date"]
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {label}
                      </label>
                      <input
                        type="date"
                        className={fieldClass}
                        value={form[key] || ""}
                        onChange={(e) => updateField(key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Subjects studied
                    </label>
                    <textarea
                      className={textareaClass}
                      value={form.subjectsStudied || ""}
                      onChange={(e) => updateField("subjectsStudied", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Remarks
                    </label>
                    <textarea
                      className={textareaClass}
                      value={form.remarks || ""}
                      onChange={(e) => updateField("remarks", e.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={saveTc}
                    disabled={saving}
                    className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(245,158,11,0.28)] hover:from-amber-600 hover:to-orange-500 disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save Transfer Certificate"}
                  </button>
                  <button
                    type="button"
                    onClick={downloadTc}
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Download TC
                  </button>
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  Student details are dynamic. TC-specific fields remain editable here.
                  Preview and download use the saved TC record.
                </p>
              </>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Select a student first.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
