"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "../../../lib/firebase";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import ReportCardPreview from "@/app/components/shared/report-card-preview";
import {
  buildReportCardHtml,
  getDefaultReportCard,
  getEmptyProfileRow,
  getEmptySubjectRow,
  mergeReportCardData
} from "../../../lib/report-card";

const fieldClass =
  "h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500";

const textareaClass =
  "min-h-[96px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500";

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

function ClipboardIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M9 4.75H15C15 3.78 14.22 3 13.25 3H10.75C9.78 3 9 3.78 9 4.75Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 4.75H7.75C6.78 4.75 6 5.53 6 6.5V18.25C6 19.22 6.78 20 7.75 20H16.25C17.22 20 18 19.22 18 18.25V6.5C18 5.53 17.22 4.75 16.25 4.75H15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 10.5H15M9 14H15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

const tabs = [
  { id: "basic", label: "Basic Details" },
  { id: "subjects", label: "Scholastic" },
  { id: "personality", label: "Personality" },
  { id: "remarks", label: "Attendance & Remarks" },
  { id: "preview", label: "Preview" }
];

export default function MarksheetSection({
  students,
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
    setLocalIsOpen((value) => !value);
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState(getDefaultReportCard());
  const [saving, setSaving] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [savedAt, setSavedAt] = useState("");
  const [activeTab, setActiveTab] = useState("basic");

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
    const loadMarksheet = async () => {
      if (!selectedStudent?.id) return;
      setLoadingDoc(true);
      setSavedAt("");
      try {
        const reportRef = doc(db, "reportCards", selectedStudent.id);
        const snap = await getDoc(reportRef);
        if (snap.exists()) {
          setForm(mergeReportCardData(selectedStudent, snap.data()));
          setSavedAt(
            snap.data()?.updatedAt?.toDate?.().toLocaleString("en-IN") || ""
          );
        } else {
          setForm(getDefaultReportCard(selectedStudent));
        }
      } catch (err) {
        console.error(err);
        setForm(getDefaultReportCard(selectedStudent));
      } finally {
        setLoadingDoc(false);
      }
    };

    loadMarksheet();
  }, [selectedStudent]);

  useEffect(() => {
    setActiveTab("basic");
  }, [selectedId]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateSubjectRow = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      subjects: (prev.subjects || []).map((row, rowIndex) =>
        rowIndex === index ? { ...row, [key]: value } : row
      )
    }));
  };

  const updateProfileRow = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      personality: (prev.personality || []).map((row, rowIndex) =>
        rowIndex === index ? { ...row, [key]: value } : row
      )
    }));
  };

  const addSubjectRow = () => {
    setForm((prev) => ({
      ...prev,
      subjects: [...(prev.subjects || []), getEmptySubjectRow()]
    }));
  };

  const addProfileRow = () => {
    setForm((prev) => ({
      ...prev,
      personality: [...(prev.personality || []), getEmptyProfileRow()]
    }));
  };

  const removeSubjectRow = (index) => {
    setForm((prev) => ({
      ...prev,
      subjects: (prev.subjects || []).filter((_, rowIndex) => rowIndex !== index)
    }));
  };

  const removeProfileRow = (index) => {
    setForm((prev) => ({
      ...prev,
      personality: (prev.personality || []).filter((_, rowIndex) => rowIndex !== index)
    }));
  };

  const saveMarksheet = async () => {
    if (!selectedStudent?.id) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, "reportCards", selectedStudent.id),
        {
          ...form,
          studentId: selectedStudent.id,
          studentName: selectedStudent.name || "",
          className: form.className || selectedStudent.class || "",
          sectionName: form.sectionName || selectedStudent.section || "",
          rollNo: form.rollNo || selectedStudent.rollNo || "",
          fatherName: form.fatherName || selectedStudent.fatherName || "",
          motherName: form.motherName || selectedStudent.motherName || "",
          photoUrl: form.photoUrl || selectedStudent.photoUrl || "",
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      setSavedAt(new Date().toLocaleString("en-IN"));
      alert("Marksheet saved.");
    } catch (err) {
      console.error(err);
      alert("Could not save marksheet.");
    } finally {
      setSaving(false);
    }
  };

  const downloadMarksheet = () => {
    if (!selectedStudent?.id) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.open();
    win.document.write(
      buildReportCardHtml({
        ...form,
        className: form.className || selectedStudent.class || "",
        sectionName: form.sectionName || selectedStudent.section || "",
        rollNo: form.rollNo || selectedStudent.rollNo || "",
        fatherName: form.fatherName || selectedStudent.fatherName || "",
        motherName: form.motherName || selectedStudent.motherName || "",
        photoUrl: form.photoUrl || selectedStudent.photoUrl || "",
        pupilName: form.pupilName || selectedStudent.name || ""
      })
    );
    win.document.close();
  };

  const renderBasicTab = () => (
    <>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Academic Year
          </label>
          <input
            className={fieldClass}
            value={form.academicYear || ""}
            onChange={(e) => updateField("academicYear", e.target.value)}
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
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Issue Date
          </label>
          <input
            type="date"
            className={fieldClass}
            value={form.issueDate || ""}
            onChange={(e) => updateField("issueDate", e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {[
          ["pupilName", "Student Name"],
          ["batch", "Batch"],
          ["rollNo", "Roll No"],
          ["dateOfBirth", "Date of Birth", "date"],
          ["fatherName", "Father's Name"],
          ["motherName", "Mother's Name"],
          ["className", "Class"],
          ["sectionName", "Section"]
        ].map(([key, label, type]) => (
          <div key={key}>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              {label}
            </label>
            <input
              type={type || "text"}
              className={fieldClass}
              value={form[key] || ""}
              onChange={(e) => updateField(key, e.target.value)}
            />
          </div>
        ))}
      </div>
    </>
  );

  const renderSubjectsTab = () => (
    <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-rose-800">
          Subject Grades
        </p>
        <button
          type="button"
          onClick={addSubjectRow}
          className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
        >
          Add Subject
        </button>
      </div>
      <div className="max-h-[560px] overflow-auto p-3">
        <div className="space-y-3">
          {(form.subjects || []).map((row, index) => (
            <div
              key={`subject-row-${index}`}
              className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-[1.35fr_0.65fr_auto]"
            >
              <input
                className={fieldClass}
                value={row.subject || ""}
                onChange={(e) => updateSubjectRow(index, "subject", e.target.value)}
                placeholder="Subject name"
              />
              <input
                className={fieldClass}
                value={row.finalTerm || row.secondTerm || row.firstTerm || ""}
                onChange={(e) => updateSubjectRow(index, "finalTerm", e.target.value)}
                placeholder="Final Term"
              />
              <button
                type="button"
                onClick={() => removeSubjectRow(index)}
                className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPersonalityTab = () => (
    <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-rose-800">
          Personality Profile
        </p>
        <button
          type="button"
          onClick={addProfileRow}
          className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
        >
          Add Row
        </button>
      </div>
      <div className="max-h-[560px] overflow-auto p-3">
        <div className="space-y-3">
          {(form.personality || []).map((row, index) => (
            <div
              key={`profile-row-${index}`}
              className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-[1.35fr_0.65fr_auto]"
            >
              <input
                className={fieldClass}
                value={row.label || ""}
                onChange={(e) => updateProfileRow(index, "label", e.target.value)}
                placeholder="Profile area"
              />
              <input
                className={fieldClass}
                value={row.finalTerm || row.secondTerm || row.firstTerm || ""}
                onChange={(e) => updateProfileRow(index, "finalTerm", e.target.value)}
                placeholder="Final Term"
              />
              <button
                type="button"
                onClick={() => removeProfileRow(index)}
                className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderRemarksTab = () => (
    <>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {[
          ["promotedTo", "Promoted To"],
          ["resultStatus", "Result / Status"],
          ["workingDays", "Working Days"],
          ["daysPresent", "Days Present"]
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
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3">
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
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Grading Note
          </label>
          <textarea
            className={textareaClass}
            value={form.gradingNote || ""}
            onChange={(e) => updateField("gradingNote", e.target.value)}
          />
        </div>
      </div>
    </>
  );

  return (
    <div className="card-soft mt-6 overflow-hidden">
      <div className="flex items-start justify-between gap-4 py-1 px-1">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 text-white flex items-center justify-center shadow">
            <ClipboardIcon />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Marksheet / Report Card
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Create, save and print dynamic report cards for students.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSectionToggle}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 mr-3"
          aria-label={
            isOpen ? "Collapse Marksheet section" : "Expand Marksheet section"
          }
        >
          <ChevronIcon isOpen={isOpen} />
        </button>
      </div>

      {isOpen && (
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[0.72fr_1.28fr]">
          <div className="space-y-4 xl:sticky xl:top-24 self-start">
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
                className="mt-4 h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <div className="mt-4 max-h-[440px] overflow-auto space-y-2 pr-1">
                {filteredStudents.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => setSelectedId(student.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      selectedId === student.id
                        ? "border-rose-400 bg-gradient-to-r from-rose-50 to-orange-50 shadow-[0_12px_30px_rgba(244,63,94,0.10)]"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <p className="font-semibold text-slate-800">{student.name}</p>
                    <p className="text-xs text-slate-500">
                      Class {student.class || "--"}
                      {student.section ? ` (${student.section})` : ""} | Roll {student.rollNo || "--"}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={panelClass}>
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="card-title">Marksheet Workspace</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Click the section you want to edit. Only that part will open.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {savedAt && (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Saved: {savedAt}
                    </span>
                  )}
                  {loadingDoc && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                      Loading saved marksheet...
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                      activeTab === tab.id
                        ? "bg-gradient-to-r from-rose-600 to-orange-500 text-white shadow-[0_10px_24px_rgba(244,63,94,0.22)]"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {selectedStudent ? (
              <>
                <div className="mt-4 rounded-[24px] border border-rose-100 bg-gradient-to-r from-rose-50 via-white to-orange-50 px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      {selectedStudent.photoUrl ? (
                        <img
                          src={selectedStudent.photoUrl}
                          alt={selectedStudent.name}
                          className="h-14 w-14 rounded-2xl border border-white object-cover shadow-sm"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-lg font-bold text-rose-700 shadow-sm">
                          {selectedStudent.name?.[0] || "S"}
                        </div>
                      )}
                      <div>
                        <p className="text-base font-bold text-slate-900">{selectedStudent.name}</p>
                        <p className="text-xs text-slate-500">
                          Dynamic student profile linked to this report card
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs sm:min-w-[230px]">
                      <div className="rounded-2xl bg-white px-3 py-2">
                        <p className="text-slate-400">Class</p>
                        <p className="font-semibold text-slate-700">
                          {selectedStudent.class || "--"}
                          {selectedStudent.section ? ` (${selectedStudent.section})` : ""}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-2">
                        <p className="text-slate-400">Roll</p>
                        <p className="font-semibold text-slate-700">{selectedStudent.rollNo || "--"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {activeTab === "basic" && renderBasicTab()}
                {activeTab === "subjects" && renderSubjectsTab()}
                {activeTab === "personality" && renderPersonalityTab()}
                {activeTab === "remarks" && renderRemarksTab()}
                {activeTab === "preview" && (
                  <div className="mt-4">
                    <ReportCardPreview reportCard={form} />
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={saveMarksheet}
                    disabled={saving}
                    className="rounded-2xl bg-gradient-to-r from-rose-600 to-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(244,63,94,0.24)] hover:from-rose-700 hover:to-orange-500 disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save Marksheet"}
                  </button>
                  <button
                    type="button"
                    onClick={downloadMarksheet}
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Download Marksheet
                  </button>
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  Jo section edit karna hai bas usi tab par click kijiye. Isse form clean aur readable rahega.
                </p>
              </>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Select a student first.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
