"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const monthOptions = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" }
];

export default function StudentsFeesList({
  students,
  onFetchMonthlyFees,
  onSaveMonthlyFees,
  onUpdateStudent,
  onDeleteStudent
}) {
  const today = new Date();
  const defaultMonth = today.getMonth() + 1;
  const defaultYear = today.getFullYear();

  const [isOpen, setIsOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [feesByStudent, setFeesByStudent] = useState({});
  const [loadingFees, setLoadingFees] = useState({});
  const [savingFees, setSavingFees] = useState({});
  const [feeInputs, setFeeInputs] = useState({});
  const [editModal, setEditModal] = useState(null);
  const [studentEditModal, setStudentEditModal] = useState(null);
  const [savingStudent, setSavingStudent] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState({});
  const [docPreview, setDocPreview] = useState(null);

  useEffect(() => {
    if (!studentEditModal && !editModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [studentEditModal, editModal]);

  useEffect(() => {
    return () => {
      if (docPreview?.isObjectUrl) {
        URL.revokeObjectURL(docPreview.url);
      }
    };
  }, [docPreview]);

  const classOptions = useMemo(() => {
    const unique = Array.from(
      new Set(
        students
          .map((item) => String(item.class || "").trim())
          .filter(Boolean)
      )
    );
    return ["all", ...unique];
  }, [students]);

  const getStudentById = (studentId) =>
    students.find((item) => item.id === studentId);

  const usesTransport = (student) =>
    !!student?.transportMode && student.transportMode !== "on-foot";

  const escapeRegex = (value) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const highlightText = (text, term) => {
    if (!text) return "—";
    if (!term) return text;
    const safe = escapeRegex(term);
    const regex = new RegExp(`(${safe})`, "ig");
    const parts = String(text).split(regex);
    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark
          key={`${part}-${index}`}
          className="bg-amber-200 text-slate-900 rounded px-1"
        >
          {part}
        </mark>
      ) : (
        <span key={`${part}-${index}`}>{part}</span>
      )
    );
  };

  const filteredStudents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return students.filter((student) => {
      const matchesClass =
        classFilter === "all" || String(student.class) === classFilter;
      const matchesSearch =
        !term ||
        student.name?.toLowerCase().includes(term) ||
        String(student.rollNo || "").toLowerCase().includes(term) ||
        student.fatherName?.toLowerCase().includes(term);
      return matchesClass && matchesSearch;
    });
  }, [students, searchTerm, classFilter]);

  const getInput = (studentId) => {
    const student = getStudentById(studentId);
    return (
      feeInputs[studentId] || {
        month: defaultMonth,
        year: defaultYear,
        totalFees: "",
        paidFees: "",
        transportFee: usesTransport(student) ? Number(student?.transportFee || 0) : 0
      }
    );
  };

  const updateInput = (studentId, patch) => {
    setFeeInputs((prev) => ({
      ...prev,
      [studentId]: {
        ...getInput(studentId),
        ...patch
      }
    }));
  };

  const handleToggle = async (studentId) => {
    if (expandedId === studentId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(studentId);
    if (!feesByStudent[studentId]) {
      setLoadingFees((prev) => ({ ...prev, [studentId]: true }));
      try {
        const data = await onFetchMonthlyFees(studentId);
        setFeesByStudent((prev) => ({ ...prev, [studentId]: data }));
      } catch (err) {
        console.error(err);
        alert("Could not load fee history. Please retry.");
      } finally {
        setLoadingFees((prev) => ({ ...prev, [studentId]: false }));
      }
    }
  };

  const handleSaveFees = async (studentId) => {
    const input = getInput(studentId);
    setSavingFees((prev) => ({ ...prev, [studentId]: true }));
    try {
      await onSaveMonthlyFees(studentId, input);
      const data = await onFetchMonthlyFees(studentId);
      setFeesByStudent((prev) => ({ ...prev, [studentId]: data }));
      setFeeInputs((prev) => ({
        ...prev,
        [studentId]: {
          month: defaultMonth,
          year: defaultYear,
          totalFees: "",
          paidFees: "",
          transportFee: usesTransport(getStudentById(studentId))
            ? Number(getStudentById(studentId)?.transportFee || 0)
            : 0
        }
      }));
    } catch (err) {
      console.error(err);
      alert("Could not save monthly fees. Please retry.");
    } finally {
      setSavingFees((prev) => ({ ...prev, [studentId]: false }));
    }
  };

  const formatUpdatedAt = (value) => {
    if (!value) return "—";
    const date =
      typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString();
  };

  const openEditModal = (studentId, fee) => {
    setEditModal({
      studentId,
      month: fee.month,
      year: fee.year,
      totalFees: fee.totalFees,
      transportFee: fee.transportFee || 0,
      paidFees: fee.paidFees
    });
  };

  const closeEditModal = () => setEditModal(null);

  const saveEditModal = async () => {
    if (!editModal) return;
    setSavingFees((prev) => ({ ...prev, [editModal.studentId]: true }));
    try {
      await onSaveMonthlyFees(editModal.studentId, editModal);
      const data = await onFetchMonthlyFees(editModal.studentId);
      setFeesByStudent((prev) => ({
        ...prev,
        [editModal.studentId]: data
      }));
      closeEditModal();
    } catch (err) {
      console.error(err);
      alert("Could not update fee record. Please retry.");
    } finally {
      setSavingFees((prev) => ({ ...prev, [editModal.studentId]: false }));
    }
  };

  const openStudentEditModal = (student) => {
    setStudentEditModal({
      studentId: student.id,
      name: student.name || "",
      class: student.class || "",
      section: student.section || "",
      rollNo: student.rollNo || "",
      dob: student.dob || "",
      fatherName: student.fatherName || "",
      motherName: student.motherName || "",
      gender: student.gender || "",
      bloodGroup: student.bloodGroup || "",
      contactNo: student.contactNo || "",
      address: student.address || "",
      transportMode: student.transportMode || "on-foot",
      photoUrl: student.photoUrl || "",
      photoFile: null,
      photoPreviewUrl: student.photoUrl || "",
      photoPreviewIsObjectUrl: false,
      documents: Array.isArray(student.documents) ? student.documents : [],
      newDocuments: []
    });
  };

  const closeStudentEditModal = () => {
    if (studentEditModal?.photoPreviewIsObjectUrl && studentEditModal.photoPreviewUrl) {
      URL.revokeObjectURL(studentEditModal.photoPreviewUrl);
    }
    setStudentEditModal(null);
  };

  const handleStudentPhotoChange = (file) => {
    setStudentEditModal((prev) => {
      if (!prev) return prev;
      if (prev.photoPreviewIsObjectUrl && prev.photoPreviewUrl) {
        URL.revokeObjectURL(prev.photoPreviewUrl);
      }
      if (!file) {
        return {
          ...prev,
          photoFile: null,
          photoPreviewUrl: prev.photoUrl || "",
          photoPreviewIsObjectUrl: false
        };
      }
      const objectUrl = URL.createObjectURL(file);
      return {
        ...prev,
        photoFile: file,
        photoPreviewUrl: objectUrl,
        photoPreviewIsObjectUrl: true
      };
    });
  };

  const updateStudentModal = (patch) => {
    setStudentEditModal((prev) => ({ ...prev, ...patch }));
  };

  const addNewDocRow = () => {
    setStudentEditModal((prev) => ({
      ...prev,
      newDocuments: [...(prev.newDocuments || []), { type: "birth-certificate", file: null }]
    }));
  };

  const updateNewDocRow = (index, patch) => {
    setStudentEditModal((prev) => ({
      ...prev,
      newDocuments: (prev.newDocuments || []).map((item, i) =>
        i === index ? { ...item, ...patch } : item
      )
    }));
  };

  const removeNewDocRow = (index) => {
    setStudentEditModal((prev) => ({
      ...prev,
      newDocuments: (prev.newDocuments || []).filter((_, i) => i !== index)
    }));
  };

  const removeExistingDoc = (index) => {
    setStudentEditModal((prev) => ({
      ...prev,
      documents: (prev.documents || []).filter((_, i) => i !== index)
    }));
  };

  const openDocPreview = ({ url, file, fileName, type }) => {
    if (!url && !file) return;
    if (docPreview?.isObjectUrl) {
      URL.revokeObjectURL(docPreview.url);
    }
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setDocPreview({
        url: objectUrl,
        fileName: fileName || file.name || "Document",
        type: type || file.type || "",
        isObjectUrl: true
      });
      return;
    }
    setDocPreview({
      url,
      fileName: fileName || "Document",
      type: type || "",
      isObjectUrl: false
    });
  };

  const closeDocPreview = () => {
    if (docPreview?.isObjectUrl) {
      URL.revokeObjectURL(docPreview.url);
    }
    setDocPreview(null);
  };

  const isImagePreview = (item) => {
    const name = (item?.fileName || "").toLowerCase();
    const url = (item?.url || "").toLowerCase();
    const mime = (item?.type || "").toLowerCase();
    return (
      mime.startsWith("image/") ||
      /\.(jpg|jpeg|png|webp|gif|bmp)$/.test(name) ||
      /\.(jpg|jpeg|png|webp|gif|bmp)(\?|$)/.test(url)
    );
  };

  const isPdfPreview = (item) => {
    const name = (item?.fileName || "").toLowerCase();
    const url = (item?.url || "").toLowerCase();
    const mime = (item?.type || "").toLowerCase();
    return mime === "application/pdf" || name.endsWith(".pdf") || /\.pdf(\?|$)/.test(url);
  };

  const saveStudentModal = async () => {
    if (!studentEditModal || !onUpdateStudent) return;
    setSavingStudent(true);
    try {
      await onUpdateStudent(studentEditModal.studentId, {
        name: studentEditModal.name,
        class: studentEditModal.class,
        section: studentEditModal.section,
        rollNo: studentEditModal.rollNo,
        dob: studentEditModal.dob,
        fatherName: studentEditModal.fatherName,
        motherName: studentEditModal.motherName,
        gender: studentEditModal.gender,
        bloodGroup: studentEditModal.bloodGroup,
        contactNo: studentEditModal.contactNo,
        address: studentEditModal.address,
        transportMode: studentEditModal.transportMode,
        documents: studentEditModal.documents || []
      }, studentEditModal.photoFile, studentEditModal.newDocuments || []);
      closeStudentEditModal();
    } catch (err) {
      console.error(err);
      alert("Could not update student profile.");
    } finally {
      setSavingStudent(false);
    }
  };

  const handleDeleteStudent = async (student) => {
    if (!onDeleteStudent || !student?.id) return;
    setDeletingStudent((prev) => ({ ...prev, [student.id]: true }));
    try {
      await onDeleteStudent(student);
      setFeesByStudent((prev) => {
        const next = { ...prev };
        delete next[student.id];
        return next;
      });
      setFeeInputs((prev) => {
        const next = { ...prev };
        delete next[student.id];
        return next;
      });
      if (expandedId === student.id) {
        setExpandedId(null);
      }
    } finally {
      setDeletingStudent((prev) => ({ ...prev, [student.id]: false }));
    }
  };

  return (
    <div className="card card-pad">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="w-full flex items-center justify-between text-left"
        aria-expanded={isOpen}
        aria-controls="students-fees-panel"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow">
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
              Students & Fees
            </h2>
          <p className="text-sm text-slate-500 mt-1">
            Search, filter and manage monthly fees in one place
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
        id="students-fees-panel"
        className={`overflow-hidden transition-[max-height,opacity] duration-500 ${
          isOpen ? "max-h-[3000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <input
            placeholder="Search by name, roll, father name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-72 h-11 border border-slate-200 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className={`w-full sm:w-40 h-11 border rounded-xl px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              classFilter === "all"
                ? "border-slate-200"
                : "border-indigo-400 bg-indigo-50"
            }`}
          >
            {classOptions.map((className) => (
              <option key={className} value={className}>
                {className === "all" ? "All Classes" : `Class ${className}`}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>Total Students: {students.length}</span>
          <span>Showing: {filteredStudents.length}</span>
        </div>

      <div className="mt-6 stack-4 max-h-[72vh] overflow-auto pr-1">
        {filteredStudents.map((student) => {
          const studentFees = feesByStudent[student.id] || [];
          const isExpanded = expandedId === student.id;
          const input = getInput(student.id);
          const initials =
            student.name?.split(" ").map((part) => part[0]).join("") || "S";

          return (
            <div
              key={student.id}
              className="card-soft p-4 sm:p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => handleToggle(student.id)}
                  className="flex items-center gap-4 text-left"
                >
                  {student.photoUrl ? (
                    <img
                      src={student.photoUrl}
                      alt={student.name}
                      className="h-14 w-14 rounded-2xl object-cover border"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center font-semibold">
                      {initials}
                    </div>
                  )}
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {highlightText(student.name, searchTerm)}
                    </p>
                    <p className="text-sm text-slate-500">
                      Class{" "}
                      <span
                        className={
                          classFilter !== "all" &&
                          String(student.class) === classFilter
                            ? "font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full"
                            : "font-semibold text-slate-700"
                        }
                      >
                        {student.class}
                      </span>{" "}
                      {student.section ? `(${student.section}) ` : ""}
                      | Roll {highlightText(student.rollNo, searchTerm)}
                    </p>
                    {student.fatherName && (
                      <p className="text-xs text-slate-400 mt-1">
                        Father: {highlightText(student.fatherName, searchTerm)}
                      </p>
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggle(student.id)}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full"
                >
                  {isExpanded ? "Hide Details" : "More Details"}
                  <span
                    className={`transition-transform ${
                      isExpanded ? "rotate-180" : "rotate-0"
                    }`}
                  >
                    ▼
                  </span>
                </button>
              </div>

              <div
                className={`overflow-hidden transition-[max-height,opacity] duration-500 ${
                  isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="card-title">
                        Student Details
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openStudentEditModal(student);
                          }}
                          className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100"
                        >
                          Edit Profile
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStudent(student);
                          }}
                          className="text-xs font-semibold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg hover:bg-rose-100 disabled:opacity-60"
                          disabled={!!deletingStudent[student.id]}
                        >
                          {deletingStudent[student.id] ? "Deleting..." : "Delete Student"}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs text-slate-500">DOB</p>
                        <p className="font-semibold text-slate-800">
                          {student.dob || "—"}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs text-slate-500">Father</p>
                        <p className="font-semibold text-slate-800">
                          {student.fatherName || "—"}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs text-slate-500">Section</p>
                        <p className="font-semibold text-slate-800">
                          {student.section || "—"}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs text-slate-500">Mother</p>
                        <p className="font-semibold text-slate-800">
                          {student.motherName || "—"}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs text-slate-500">Gender</p>
                        <p className="font-semibold text-slate-800">
                          {student.gender || "—"}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs text-slate-500">Blood Group</p>
                        <p className="font-semibold text-slate-800">
                          {student.bloodGroup || "—"}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs text-slate-500">Transport</p>
                        <p className="font-semibold text-slate-800">
                          {student.transportMode
                            ? student.transportMode
                                .replace("-", " ")
                                .replace("riksha", "Riksha")
                                .replace("toto", "ToTo")
                                .replace("school van", "School Van")
                                .replace("on foot", "On Foot")
                            : "On Foot"}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs text-slate-500">Contact</p>
                        <p className="font-semibold text-slate-800">
                          {student.contactNo || "—"}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3 sm:col-span-2">
                        <p className="text-xs text-slate-500">Address</p>
                        <p className="font-semibold text-slate-800">
                          {student.address || "—"}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3 sm:col-span-2">
                        <p className="text-xs text-slate-500">Documents</p>
                        {(student.documents || []).length === 0 ? (
                          <p className="font-semibold text-slate-800">No documents</p>
                        ) : (
                          <div className="space-y-2 mt-1">
                            {(student.documents || []).map((docItem, index) => (
                              <div
                                key={`${docItem.url}-${index}`}
                                className="flex flex-wrap items-center gap-2 text-xs"
                              >
                                <a
                                  href={docItem.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-indigo-700 underline underline-offset-2"
                                >
                                  {(docItem.type || "document").replaceAll("-", " ")} -{" "}
                                  {docItem.fileName || "Open"}
                                </a>
                                <button
                                  type="button"
                                  onClick={() =>
                                    openDocPreview({
                                      url: docItem.url,
                                      fileName: docItem.fileName,
                                      type: docItem.type
                                    })
                                  }
                                  className="px-2 py-0.5 rounded-md border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                >
                                  Preview
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* <div className="bg-slate-50 rounded-xl p-3 sm:col-span-2">
                        <p className="text-xs text-slate-500">Parent Login Credentials</p>
                        <div className="mt-1 space-y-1">
                          <p className="text-sm text-slate-800">
                            <span className="font-semibold">Email:</span>{" "}
                            {student.parentEmail || "Not available"}
                          </p>
                          <p className="text-sm text-slate-600">
                            <span className="font-semibold">Password:</span>{" "}
                            Not retrievable (security protected)
                          </p>
                        </div>
                      </div> */}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="card-title">
                      Monthly Fees
                    </div>
                    <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="mb-1 text-[11px] font-semibold text-slate-500">
                            Month
                          </p>
                          <select
                            value={input.month}
                            onChange={(e) =>
                              updateInput(student.id, {
                                month: Number(e.target.value)
                              })
                            }
                            className="h-10 w-full border border-slate-200 rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            {monthOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <p className="mb-1 text-[11px] font-semibold text-slate-500">
                            Year
                          </p>
                          <input
                            type="number"
                            value={input.year}
                            onChange={(e) =>
                              updateInput(student.id, {
                                year: Number(e.target.value)
                              })
                            }
                            className="h-10 w-full border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Year"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="mb-1 text-[11px] font-semibold text-slate-500">
                            Tuition Charge
                          </p>
                          <input
                            type="number"
                            value={input.totalFees}
                            onChange={(e) =>
                              updateInput(student.id, {
                                totalFees: e.target.value
                              })
                            }
                            className="h-10 w-full border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Tuition Charge"
                          />
                        </div>
                        <div>
                          <p className="mb-1 text-[11px] font-semibold text-slate-500">
                            Transport Charge
                          </p>
                          <input
                            type="number"
                            value={input.transportFee}
                            onChange={(e) =>
                              updateInput(student.id, {
                                transportFee: e.target.value
                              })
                            }
                            disabled={!usesTransport(student)}
                            className="h-10 w-full border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                            placeholder="Transport Charge"
                          />
                        </div>
                      </div>
                      {!usesTransport(student) && (
                        <p className="text-xs text-slate-500">
                          Transport mode is On Foot, so transport charge is 0.
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="mb-1 text-[11px] font-semibold text-slate-500">
                            Paid Amount
                          </p>
                          <input
                            type="number"
                            value={input.paidFees}
                            onChange={(e) =>
                              updateInput(student.id, {
                                paidFees: e.target.value
                              })
                            }
                            className="h-10 w-full border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Paid Fees"
                          />
                        </div>
                        <div>
                          <p className="mb-1 text-[11px] font-semibold text-slate-500">
                            Monthly Charge
                          </p>
                          <input
                            value={`Rs ${
                              Number(input.totalFees || 0) +
                              Number(input.transportFee || 0)
                            }`}
                            readOnly
                            className="h-10 w-full border border-slate-200 rounded-lg px-3 text-sm bg-slate-50 text-slate-600"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSaveFees(student.id)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-60"
                        disabled={savingFees[student.id]}
                      >
                        {savingFees[student.id] ? "Saving..." : "Save Monthly Fees"}
                      </button>
                    </div>

                    <div className="card-soft">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-800">
                          Fee History
                        </p>
                        {loadingFees[student.id] && (
                          <span className="text-xs text-slate-500">
                            Loading...
                          </span>
                        )}
                      </div>
                      <div className="mt-3 space-y-2">
                        {studentFees.length === 0 && !loadingFees[student.id] && (
                          <p className="text-sm text-slate-500">
                            No monthly fees added yet.
                          </p>
                        )}
                        {studentFees.map((fee) => (
                          <div
                            key={fee.id}
                            className="flex items-center justify-between text-sm bg-slate-50 rounded-xl px-3 py-2"
                          >
                            <div>
                              <p className="font-semibold text-slate-800">
                                {fee.monthName} {fee.year}
                              </p>
                              <p className="text-xs text-slate-500">
                                Tuition: Rs {fee.totalFees} | Transport: Rs{" "}
                                {fee.transportFee || 0} | Paid: Rs {fee.paidFees}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                Updated: {formatUpdatedAt(fee.updatedAt)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-semibold ${
                                  fee.dueFees > 0
                                    ? "text-rose-600"
                                    : "text-emerald-600"
                                }`}
                              >
                                Due Rs {fee.dueFees}
                              </span>
                              <button
                                type="button"
                                onClick={() => openEditModal(student.id, fee)}
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded-full"
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredStudents.length === 0 && (
          <div className="text-center py-10 text-slate-500">
            No students match your search.
          </div>
        )}
        </div>
      </div>

      {editModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[95] bg-slate-900/45 p-4 overflow-y-auto"
            onClick={closeEditModal}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl mx-auto my-10"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Edit Monthly Fees
              </h3>
              <button
                type="button"
                onClick={closeEditModal}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={editModal.month}
                  onChange={(e) =>
                    setEditModal((prev) => ({
                      ...prev,
                      month: Number(e.target.value)
                    }))
                  }
                  className="h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {monthOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={editModal.year}
                  onChange={(e) =>
                    setEditModal((prev) => ({
                      ...prev,
                      year: Number(e.target.value)
                    }))
                  }
                  className="h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Year"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  value={editModal.totalFees}
                  onChange={(e) =>
                    setEditModal((prev) => ({
                      ...prev,
                      totalFees: e.target.value
                    }))
                  }
                  className="h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Tuition Charge"
                />
                <input
                  type="number"
                  value={editModal.transportFee}
                  onChange={(e) =>
                    setEditModal((prev) => ({
                      ...prev,
                      transportFee: e.target.value
                    }))
                  }
                  className="h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Transport Charge"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  value={editModal.paidFees}
                  onChange={(e) =>
                    setEditModal((prev) => ({
                      ...prev,
                      paidFees: e.target.value
                    }))
                  }
                  className="h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Paid Fees"
                />
                <input
                  value={`Net: Rs ${
                    Number(editModal.totalFees || 0) +
                    Number(editModal.transportFee || 0)
                  }`}
                  readOnly
                  className="h-10 border border-slate-200 rounded-lg px-3 text-sm bg-slate-50 text-slate-600"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 rounded-lg text-sm border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEditModal}
                  className="px-4 py-2 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                  disabled={savingFees[editModal.studentId]}
                >
                  {savingFees[editModal.studentId] ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
          </div>,
          document.body
        )}

      {studentEditModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[95] bg-slate-900/50 overflow-y-auto p-4"
            onClick={closeStudentEditModal}
          >
            <div
              className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl max-h-[88vh] overflow-auto mx-auto my-8"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Edit Student Profile
              </h3>
                <button
                  type="button"
                  onClick={closeStudentEditModal}
                  className="text-slate-400 hover:text-slate-600"
                >
                  x
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-600">Student Name</p>
                <input value={studentEditModal.name} onChange={(e) => updateStudentModal({ name: e.target.value })} className="h-10 w-full border border-slate-200 rounded-lg px-3 text-sm" placeholder="Student Name" />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-600">Roll No</p>
                <input value={studentEditModal.rollNo} onChange={(e) => updateStudentModal({ rollNo: e.target.value })} className="h-10 w-full border border-slate-200 rounded-lg px-3 text-sm" placeholder="Roll No" />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-600">Class</p>
                <input value={studentEditModal.class} onChange={(e) => updateStudentModal({ class: e.target.value })} className="h-10 w-full border border-slate-200 rounded-lg px-3 text-sm" placeholder="Class" />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-600">Section</p>
                <input value={studentEditModal.section} onChange={(e) => updateStudentModal({ section: e.target.value })} className="h-10 w-full border border-slate-200 rounded-lg px-3 text-sm" placeholder="Section" />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-600">Date of Birth</p>
                <input type="date" value={studentEditModal.dob} onChange={(e) => updateStudentModal({ dob: e.target.value })} className="h-10 w-full border border-slate-200 rounded-lg px-3 text-sm" />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-600">Contact Number</p>
                <input value={studentEditModal.contactNo} onChange={(e) => updateStudentModal({ contactNo: e.target.value })} className="h-10 w-full border border-slate-200 rounded-lg px-3 text-sm" placeholder="Contact Number" />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-600">Father Name</p>
                <input value={studentEditModal.fatherName} onChange={(e) => updateStudentModal({ fatherName: e.target.value })} className="h-10 w-full border border-slate-200 rounded-lg px-3 text-sm" placeholder="Father Name" />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-600">Mother Name</p>
                <input value={studentEditModal.motherName} onChange={(e) => updateStudentModal({ motherName: e.target.value })} className="h-10 w-full border border-slate-200 rounded-lg px-3 text-sm" placeholder="Mother Name" />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-600">Gender</p>
                <input value={studentEditModal.gender} onChange={(e) => updateStudentModal({ gender: e.target.value })} className="h-10 w-full border border-slate-200 rounded-lg px-3 text-sm" placeholder="Gender" />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-600">Blood Group</p>
                <input value={studentEditModal.bloodGroup} onChange={(e) => updateStudentModal({ bloodGroup: e.target.value })} className="h-10 w-full border border-slate-200 rounded-lg px-3 text-sm" placeholder="Blood Group" />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-600">Transport Mode</p>
                <select
                  value={studentEditModal.transportMode}
                  onChange={(e) => updateStudentModal({ transportMode: e.target.value })}
                  className="h-10 w-full border border-slate-200 rounded-lg px-3 text-sm"
                >
                  <option value="on-foot">On Foot</option>
                  <option value="riksha">Riksha</option>
                  <option value="toto">ToTo</option>
                  <option value="school-van">School Van</option>
                </select>
              </div>
              <div className="md:col-span-2 rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500 mb-2">Profile Photo</p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="h-16 w-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center">
                    {studentEditModal.photoPreviewUrl ? (
                      <img
                        src={studentEditModal.photoPreviewUrl}
                        alt="Student profile preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[11px] text-slate-400">No photo</span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleStudentPhotoChange(e.target.files?.[0] || null)}
                    className="h-10 border border-slate-200 rounded-lg px-2 text-sm w-full"
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <p className="mb-1 text-xs font-semibold text-slate-600">Address</p>
                <input value={studentEditModal.address} onChange={(e) => updateStudentModal({ address: e.target.value })} className="h-10 w-full border border-slate-200 rounded-lg px-3 text-sm" placeholder="Address" />
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-800">Existing Documents</p>
              <div className="mt-2 space-y-2">
                {(studentEditModal.documents || []).length === 0 && (
                  <p className="text-xs text-slate-500">No existing documents.</p>
                )}
                {(studentEditModal.documents || []).map((docItem, index) => (
                  <div key={`${docItem.url}-${index}`} className="flex items-center justify-between gap-2 text-xs">
                    <a href={docItem.url} target="_blank" rel="noreferrer" className="text-indigo-700 underline truncate">
                      {(docItem.type || "document").replaceAll("-", " ")} - {docItem.fileName || "Open"}
                    </a>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          openDocPreview({
                            url: docItem.url,
                            fileName: docItem.fileName,
                            type: docItem.type
                          })
                        }
                        className="px-2 py-1 rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                      >
                        Preview
                      </button>
                      <button type="button" onClick={() => removeExistingDoc(index)} className="px-2 py-1 rounded border border-rose-200 text-rose-600">
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Add New Documents</p>
                <button type="button" onClick={addNewDocRow} className="px-2 py-1 rounded border border-slate-200 text-xs">
                  Add
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {(studentEditModal.newDocuments || []).map((item, index) => (
                  <div key={`new-doc-${index}`} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                    <select
                      value={item.type}
                      onChange={(e) => updateNewDocRow(index, { type: e.target.value })}
                      className="h-10 border border-slate-200 rounded-lg px-3 text-sm"
                    >
                      <option value="birth-certificate">Birth Certificate</option>
                      <option value="aadhaar">Aadhaar Card</option>
                      <option value="transfer-certificate">Transfer Certificate</option>
                      <option value="mark-sheet">Previous Marksheet</option>
                      <option value="other">Other Document</option>
                    </select>
                    <input type="file" onChange={(e) => updateNewDocRow(index, { file: e.target.files?.[0] || null })} className="h-10 border border-slate-200 rounded-lg px-2 text-sm" />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          item.file &&
                          openDocPreview({
                            file: item.file,
                            fileName: item.file.name,
                            type: item.file.type
                          })
                        }
                        disabled={!item.file}
                        className="h-10 px-3 rounded-lg border border-indigo-200 text-indigo-700 text-sm disabled:opacity-40"
                      >
                        Preview
                      </button>
                      <button type="button" onClick={() => removeNewDocRow(index)} className="h-10 px-3 rounded-lg border border-rose-200 text-rose-600 text-sm">
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeStudentEditModal}
                  className="px-4 py-2 rounded-lg text-sm border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveStudentModal}
                className="px-4 py-2 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                disabled={savingStudent}
              >
                {savingStudent ? "Updating..." : "Update Student"}
              </button>
            </div>
          </div>
          </div>,
          document.body
        )}

      {docPreview &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] bg-slate-900/60 p-4 overflow-y-auto"
            onClick={closeDocPreview}
          >
            <div
              className="w-full max-w-4xl bg-white rounded-2xl shadow-xl mx-auto my-8 p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {docPreview.fileName || "Document Preview"}
                </p>
                <button
                  type="button"
                  onClick={closeDocPreview}
                  className="px-3 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-2 min-h-[320px] flex items-center justify-center">
                {isImagePreview(docPreview) ? (
                  <img
                    src={docPreview.url}
                    alt={docPreview.fileName || "Document preview"}
                    className="max-h-[70vh] w-auto rounded-lg object-contain"
                  />
                ) : isPdfPreview(docPreview) ? (
                  <iframe
                    src={docPreview.url}
                    title="Document Preview"
                    className="h-[70vh] w-full rounded-lg bg-white"
                  />
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-slate-600 mb-3">
                      Preview not supported for this file type.
                    </p>
                    <a
                      href={docPreview.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700"
                    >
                      Open Document
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
