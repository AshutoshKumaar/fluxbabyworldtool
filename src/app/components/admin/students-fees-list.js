"use client";

import { useMemo, useState } from "react";

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
  onSaveMonthlyFees
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

  const classOptions = useMemo(() => {
    return ["all", "1", "2", "3", "4"];
  }, []);

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
    return (
      feeInputs[studentId] || {
        month: defaultMonth,
        year: defaultYear,
        totalFees: "",
        paidFees: ""
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
      const data = await onFetchMonthlyFees(studentId);
      setFeesByStudent((prev) => ({ ...prev, [studentId]: data }));
      setLoadingFees((prev) => ({ ...prev, [studentId]: false }));
    }
  };

  const handleSaveFees = async (studentId) => {
    const input = getInput(studentId);
    setSavingFees((prev) => ({ ...prev, [studentId]: true }));
    await onSaveMonthlyFees(studentId, input);
    const data = await onFetchMonthlyFees(studentId);
    setFeesByStudent((prev) => ({ ...prev, [studentId]: data }));
    setFeeInputs((prev) => ({
      ...prev,
      [studentId]: {
        month: defaultMonth,
        year: defaultYear,
        totalFees: "",
        paidFees: ""
      }
    }));
    setSavingFees((prev) => ({ ...prev, [studentId]: false }));
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
      paidFees: fee.paidFees
    });
  };

  const closeEditModal = () => setEditModal(null);

  const saveEditModal = async () => {
    if (!editModal) return;
    setSavingFees((prev) => ({ ...prev, [editModal.studentId]: true }));
    await onSaveMonthlyFees(editModal.studentId, editModal);
    const data = await onFetchMonthlyFees(editModal.studentId);
    setFeesByStudent((prev) => ({
      ...prev,
      [editModal.studentId]: data
    }));
    setSavingFees((prev) => ({ ...prev, [editModal.studentId]: false }));
    closeEditModal();
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
        className={`overflow-hidden transition-[max-height,opacity,transform] duration-500 ${
          isOpen
            ? "max-h-[3000px] opacity-100 translate-y-0"
            : "max-h-0 opacity-0 -translate-y-2"
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

      <div className="mt-6 stack-4">
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
                className={`overflow-hidden transition-[max-height,opacity,transform] duration-500 ${
                  isExpanded
                    ? "max-h-[2000px] opacity-100 translate-y-0"
                    : "max-h-0 opacity-0 -translate-y-2"
                }`}
              >
                <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
                  <div className="space-y-4">
                    <div className="card-title">
                      Student Details
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
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="card-title">
                      Monthly Fees
                    </div>
                    <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <select
                          value={input.month}
                          onChange={(e) =>
                            updateInput(student.id, {
                              month: Number(e.target.value)
                            })
                          }
                          className="h-10 border border-slate-200 rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {monthOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={input.year}
                          onChange={(e) =>
                            updateInput(student.id, {
                              year: Number(e.target.value)
                            })
                          }
                          className="h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Year"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="number"
                          value={input.totalFees}
                          onChange={(e) =>
                            updateInput(student.id, {
                              totalFees: e.target.value
                            })
                          }
                          className="h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Total Fees"
                        />
                        <input
                          type="number"
                          value={input.paidFees}
                          onChange={(e) =>
                            updateInput(student.id, {
                              paidFees: e.target.value
                            })
                          }
                          className="h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Paid Fees"
                        />
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
                                Total: Rs {fee.totalFees} | Paid: Rs {fee.paidFees}
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

      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
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
                  placeholder="Total Fees"
                />
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
        </div>
      )}
    </div>
  );
}
