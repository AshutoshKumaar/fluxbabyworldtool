"use client";

import { useEffect, useMemo, useState } from "react";

export default function AddStudentCard({
  name,
  setName,
  studentClass,
  setStudentClass,
  section,
  setSection,
  rollNo,
  setRollNo,
  dob,
  setDob,
  fatherName,
  setFatherName,
  motherName,
  setMotherName,
  gender,
  setGender,
  bloodGroup,
  setBloodGroup,
  contactNo,
  setContactNo,
  address,
  setAddress,
  photoFile,
  setPhotoFile,
  photoInputKey,
  uploadProgress,
  isUploading,
  documents,
  setDocuments,
  transportMode,
  setTransportMode,
  parentEmail,
  setParentEmail,
  parentPassword,
  setParentPassword,
  onAddStudent
}) {
  const [isOpen, setIsOpen] = useState(true);
  const previewUrl = useMemo(
    () => (photoFile ? URL.createObjectURL(photoFile) : ""),
    [photoFile]
  );

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const documentOptions = [
    { value: "birth-certificate", label: "Birth Certificate" },
    { value: "aadhaar", label: "Aadhaar Card" },
    { value: "transfer-certificate", label: "Transfer Certificate" },
    { value: "mark-sheet", label: "Previous Marksheet" },
    { value: "other", label: "Other Document" }
  ];

  const addDocumentRow = () => {
    setDocuments((prev) => [...prev, { type: "birth-certificate", file: null }]);
  };

  const updateDocumentRow = (index, patch) => {
    setDocuments((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  };

  const removeDocumentRow = (index) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const documentPreviews = useMemo(() => {
    return documents
      .map((item, index) => {
        if (!item?.file) return null;
        const isImage = item.file.type?.startsWith("image/");
        return {
          index,
          type: item.type,
          fileName: item.file.name,
          isImage,
          previewUrl: isImage ? URL.createObjectURL(item.file) : ""
        };
      })
      .filter(Boolean);
  }, [documents]);

  useEffect(() => {
    return () => {
      documentPreviews.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [documentPreviews]);

  return (
    <div className="card card-pad mb-8 sm:mb-10">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="w-full flex items-center justify-between text-left"
        aria-expanded={isOpen}
        aria-controls="add-student-form"
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow">
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
              Add Student & Parent Login
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Quick enrollment with complete student details
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
        id="add-student-form"
        className={`overflow-hidden transition-[max-height,opacity,transform] duration-500 ${
          isOpen
            ? "max-h-[1800px] opacity-100 translate-y-0"
            : "max-h-0 opacity-0 -translate-y-2"
        }`}
      >
        <div className="mt-5 sm:mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <div className="stack-4 mx-1 my-1">
            <div className="card-title">
              Student Info
            </div>
            <input
              placeholder="Student Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 sm:h-12 border border-slate-200 bg-white/80 px-3 sm:px-4 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                placeholder="Class *"
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                className="h-11 sm:h-12 border border-slate-200 bg-white/80 px-3 sm:px-4 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                placeholder="Section (A/B/C)"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="h-11 sm:h-12 border border-slate-200 bg-white/80 px-3 sm:px-4 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                placeholder="Roll No *"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                className="h-11 sm:h-12 border border-slate-200 bg-white/80 px-3 sm:px-4 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={transportMode}
                onChange={(e) => setTransportMode(e.target.value)}
                className="h-11 sm:h-12 border border-slate-200 bg-white/80 px-3 sm:px-4 rounded-xl text-sm sm:text-base text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="on-foot">On Foot</option>
                <option value="riksha">Riksha</option>
                <option value="toto">ToTo</option>
                <option value="school-van">School Van</option>
              </select>
            </div>
            <input
              placeholder="Date of Birth *"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full h-11 sm:h-12 border border-slate-200 bg-white/80 px-3 sm:px-4 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                placeholder="Father Name *"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                className="h-11 sm:h-12 border border-slate-200 bg-white/80 px-3 sm:px-4 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                placeholder="Mother Name"
                value={motherName}
                onChange={(e) => setMotherName(e.target.value)}
                className="h-11 sm:h-12 border border-slate-200 bg-white/80 px-3 sm:px-4 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="h-11 sm:h-12 border border-slate-200 bg-white/80 px-3 sm:px-4 rounded-xl text-sm sm:text-base text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              <input
                placeholder="Blood Group"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="h-11 sm:h-12 border border-slate-200 bg-white/80 px-3 sm:px-4 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                placeholder="Contact Number"
                value={contactNo}
                onChange={(e) => setContactNo(e.target.value)}
                className="h-11 sm:h-12 border border-slate-200 bg-white/80 px-3 sm:px-4 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <input
              placeholder="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full min-h-[44px] border border-slate-200 bg-white/80 px-3 sm:px-4 py-3 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="stack-4">
            <div className="card-title">
              Photo & Parent Login
            </div>
            <div className="border border-dashed border-slate-300 rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-slate-50 to-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Student Photo
                  </p>
                  <p className="text-xs text-slate-500">
                    Upload JPG/PNG (max ~2-3 MB recommended)
                  </p>
                </div>
                {photoFile && (
                  <span className="text-xs text-slate-600 truncate max-w-[140px]">
                    {photoFile.name}
                  </span>
                )}
              </div>

              <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm cursor-pointer hover:bg-slate-50 shadow-sm">
                  <input
                    key={photoInputKey}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  />
                  <span>Upload Photo</span>
                </label>
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Student preview"
                    className="h-14 w-14 rounded-2xl object-cover border"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-xs text-slate-400">
                    Preview
                  </div>
                )}
              </div>

              {isUploading && (
                <div className="mt-4">
                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-blue-600 transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Uploading... {uploadProgress}%
                  </p>
                </div>
              )}
            </div>

            <div className="border border-dashed border-slate-300 rounded-2xl p-4 sm:p-5 bg-white max-h-[320px] overflow-auto">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Additional Documents
                  </p>
                  <p className="text-xs text-slate-500">
                    Upload one or more documents (Birth Certificate, Aadhaar, etc.)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addDocumentRow}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                >
                  Add Document
                </button>
              </div>

              <div className="mt-3 space-y-3">
                {documents.map((item, index) => (
                  <div
                    key={`doc-${index}`}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2"
                  >
                    <select
                      value={item.type}
                      onChange={(e) =>
                        updateDocumentRow(index, { type: e.target.value })
                      }
                      className="h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {documentOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="file"
                      onChange={(e) =>
                        updateDocumentRow(index, {
                          file: e.target.files?.[0] || null
                        })
                      }
                      className="h-10 border border-slate-200 rounded-lg px-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-2 file:py-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeDocumentRow(index)}
                      className="h-10 px-3 rounded-lg border border-rose-200 text-rose-600 text-sm hover:bg-rose-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {documents.length === 0 && (
                  <p className="text-xs text-slate-500">
                    No additional documents selected.
                  </p>
                )}
              </div>

              {documentPreviews.length > 0 && (
                <div className="mt-4 border-t border-slate-200 pt-3">
                  <p className="text-xs font-semibold text-slate-600 mb-2">
                    Document Preview
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {documentPreviews.map((item) => (
                      <div
                        key={`preview-${item.index}`}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-2"
                      >
                        <p className="text-[11px] text-slate-500 mb-1 capitalize">
                          {(item.type || "document").replaceAll("-", " ")}
                        </p>
                        {item.isImage ? (
                          <img
                            src={item.previewUrl}
                            alt={item.fileName}
                            className="h-24 w-full object-cover rounded-md border"
                          />
                        ) : (
                          <div className="h-24 rounded-md border bg-white flex items-center justify-center text-xs text-slate-500">
                            Preview not available
                          </div>
                        )}
                        <p className="mt-1 truncate text-[11px] text-slate-600">
                          {item.fileName}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 sm:p-5 space-y-3">
              <p className="text-sm font-semibold text-slate-700">
                Parent Login Credentials
              </p>
              <input
                placeholder="Parent Email (Login ID) *"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                className="w-full h-11 sm:h-12 border border-slate-200 bg-white px-3 sm:px-4 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                placeholder="Parent Password *"
                type="password"
                value={parentPassword}
                onChange={(e) => setParentPassword(e.target.value)}
                className="w-full h-11 sm:h-12 border border-slate-200 bg-white px-3 sm:px-4 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={onAddStudent}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg shadow-indigo-200/50 disabled:opacity-60 transition-all"
                disabled={isUploading}
              >
                {isUploading ? "Uploading..." : "Create Student & Parent Login"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
