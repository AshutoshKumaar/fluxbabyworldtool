"use client";

import { useEffect, useMemo, useState } from "react";

export default function AddStudentCard({
  name,
  setName,
  studentClass,
  setStudentClass,
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
                placeholder="Class Number / Section *"
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                className="h-11 sm:h-12 border border-slate-200 bg-white/80 px-3 sm:px-4 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                placeholder="Roll No *"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                className="h-11 sm:h-12 border border-slate-200 bg-white/80 px-3 sm:px-4 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
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

            <input
              placeholder="Parent Email (Login ID) *"
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              className="w-full h-11 sm:h-12 border border-slate-200 bg-white/80 px-3 sm:px-4 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              placeholder="Parent Password *"
              type="password"
              value={parentPassword}
              onChange={(e) => setParentPassword(e.target.value)}
              className="w-full h-11 sm:h-12 border border-slate-200 bg-white/80 px-3 sm:px-4 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="pt-2">
              <button
                onClick={onAddStudent}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg shadow-indigo-200/50 disabled:opacity-60 transition-all"
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
