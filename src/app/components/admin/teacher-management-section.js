"use client";

import { useEffect, useMemo, useState } from "react";
import { initializeApp, deleteApp, getApp, getApps } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { collection, doc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";
import {
  GraduationCap,
  KeyRound,
  School,
  ChevronDown,
  Copy,
  Pencil,
  Power,
  X
} from "lucide-react";

const subjectPresets = [
  "English",
  "Hindi",
  "Maths",
  "Science",
  "SST",
  "EVS",
  "Computer",
  "GK",
  "Drawing",
  "Sanskrit"
];

const inputClass =
  "h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500";

const textareaClass =
  "min-h-[96px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500";

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

const groupKey = (className, section) =>
  `${normalizeClassName(className)}__${normalizeSectionName(section)}`;

const parseCsv = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const formatGroupLabel = (groupKeyValue) => {
  const [rawClassName = "", rawSectionName = ""] = String(groupKeyValue || "").split("__");
  const className = normalizeClassName(rawClassName);
  const sectionName = normalizeSectionName(rawSectionName);
  if (!className) return "Not assigned";
  return `Class ${className}${sectionName ? ` (${sectionName})` : ""}`;
};

const rankClass = (value) => {
  const normalized = normalizeClassName(value).toLowerCase();
  if (normalized === "play") return -3;
  if (normalized === "pre nursery") return -2;
  if (normalized === "nursery") return -1;
  if (normalized === "lkg") return 0;
  if (normalized === "ukg") return 1;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric + 10 : 999;
};

function StatPill({ icon: Icon, label }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
      <Icon size={14} />
      {label}
    </span>
  );
}

export default function TeacherManagementSection({
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
  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [creatingTeacher, setCreatingTeacher] = useState(false);
  const [savingTeacherUpdate, setSavingTeacherUpdate] = useState(false);
  const [teacherForm, setTeacherForm] = useState({
    teacherName: "",
    email: "",
    password: "",
    role: "teacher",
    mobileNo: "",
    qualification: "",
    subjectsText: "",
    notes: "",
    primaryClassGroup: ""
  });
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [editingTeacherId, setEditingTeacherId] = useState("");
  const [editTeacherForm, setEditTeacherForm] = useState({
    teacherName: "",
    role: "teacher",
    mobileNo: "",
    qualification: "",
    subjectsText: "",
    notes: "",
    primaryClassGroup: "",
    isActive: true
  });
  const [editSelectedGroups, setEditSelectedGroups] = useState([]);

  const teacherStats = useMemo(() => {
    const total = teachers.length;
    const active = teachers.filter((item) => item.isActive !== false).length;
    const classTeachers = teachers.filter((item) => item.role === "class_teacher").length;
    const assignedGroups = new Set(
      teachers.flatMap((item) =>
        Array.isArray(item.assignedClassGroups) ? item.assignedClassGroups : []
      )
    ).size;
    return { total, active, classTeachers, assignedGroups };
  }, [teachers]);

  const teacherRoleHelp =
    teacherForm.role === "class_teacher"
      ? "Class teacher means one primary homeroom class-section, but the same teacher can still teach multiple assigned class-section groups."
      : "Teacher can teach every class-section group assigned below and publish homework class-wise.";

  const availableGroups = useMemo(() => {
    const map = new Map();
    students.forEach((student) => {
      const className = normalizeClassName(student.class);
      const sectionName = normalizeSectionName(student.section);
      if (!className) return;
      const key = groupKey(className, sectionName);
      if (!key || map.has(key)) return;
      map.set(key, {
        key,
        className,
        sectionName,
        label: `Class ${className}${sectionName ? ` (${sectionName})` : ""}`
      });
    });
    return Array.from(map.values()).sort((a, b) => {
      const diff = rankClass(a.className) - rankClass(b.className);
      if (diff !== 0) return diff;
      return String(a.sectionName || "").localeCompare(String(b.sectionName || ""));
    });
  }, [students]);

  const fetchTeachers = async () => {
    setLoadingTeachers(true);
    try {
      const snap = await getDocs(collection(db, "teachers"));
      const items = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      items.sort((a, b) =>
        String(a.teacherName || "").localeCompare(String(b.teacherName || ""))
      );
      setTeachers(items);
    } catch (err) {
      console.error(err);
      setTeachers([]);
    } finally {
      setLoadingTeachers(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const toggleGroup = (key) => {
    setSelectedGroups((prev) =>
      prev.includes(key)
        ? prev.filter((item) => item !== key)
        : [...prev, key]
    );
  };

  const toggleEditGroup = (key) => {
    setEditSelectedGroups((prev) =>
      prev.includes(key)
        ? prev.filter((item) => item !== key)
        : [...prev, key]
    );
  };

  useEffect(() => {
    setSelectedGroups((prev) =>
      prev.filter((item) => availableGroups.some((group) => group.key === item))
    );
    setEditSelectedGroups((prev) =>
      prev.filter((item) => availableGroups.some((group) => group.key === item))
    );
    setTeacherForm((prev) => ({
      ...prev,
      primaryClassGroup: availableGroups.some(
        (group) => group.key === prev.primaryClassGroup
      )
        ? prev.primaryClassGroup
        : ""
    }));
    setEditTeacherForm((prev) => ({
      ...prev,
      primaryClassGroup: availableGroups.some(
        (group) => group.key === prev.primaryClassGroup
      )
        ? prev.primaryClassGroup
        : ""
    }));
  }, [availableGroups]);

  useEffect(() => {
    if (teacherForm.role !== "class_teacher" && teacherForm.primaryClassGroup) {
      setTeacherForm((prev) => ({ ...prev, primaryClassGroup: "" }));
    }
  }, [teacherForm.role, teacherForm.primaryClassGroup]);

  useEffect(() => {
    if (editTeacherForm.role !== "class_teacher" && editTeacherForm.primaryClassGroup) {
      setEditTeacherForm((prev) => ({ ...prev, primaryClassGroup: "" }));
    }
  }, [editTeacherForm.role, editTeacherForm.primaryClassGroup]);

  useEffect(() => {
    if (
      teacherForm.role === "class_teacher" &&
      teacherForm.primaryClassGroup &&
      !selectedGroups.includes(teacherForm.primaryClassGroup)
    ) {
      setSelectedGroups((prev) => [...prev, teacherForm.primaryClassGroup]);
    }
  }, [teacherForm.role, teacherForm.primaryClassGroup, selectedGroups]);

  useEffect(() => {
    if (
      editTeacherForm.role === "class_teacher" &&
      editTeacherForm.primaryClassGroup &&
      !editSelectedGroups.includes(editTeacherForm.primaryClassGroup)
    ) {
      setEditSelectedGroups((prev) => [...prev, editTeacherForm.primaryClassGroup]);
    }
  }, [editTeacherForm.role, editTeacherForm.primaryClassGroup, editSelectedGroups]);

  const handleCopy = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      alert(`${label} copied.`);
    } catch (err) {
      console.error(err);
      alert(`Could not copy ${label.toLowerCase()}.`);
    }
  };

  const resetForm = () => {
    setTeacherForm({
      teacherName: "",
      email: "",
      password: "",
      role: "teacher",
      mobileNo: "",
      qualification: "",
      subjectsText: "",
      notes: "",
      primaryClassGroup: ""
    });
    setSelectedGroups([]);
  };

  const resetEditForm = () => {
    setEditingTeacherId("");
    setEditTeacherForm({
      teacherName: "",
      role: "teacher",
      mobileNo: "",
      qualification: "",
      subjectsText: "",
      notes: "",
      primaryClassGroup: "",
      isActive: true
    });
    setEditSelectedGroups([]);
  };

  const createTeacher = async () => {
    const normalizedEmail = String(teacherForm.email || "").trim().toLowerCase();
    if (
      !teacherForm.teacherName ||
      !normalizedEmail ||
      !teacherForm.password ||
      selectedGroups.length === 0
    ) {
      alert("Fill teacher name, email, password and assign at least one class group.");
      return;
    }
    if (teacherForm.role === "class_teacher" && !teacherForm.primaryClassGroup) {
      alert("Select the primary class group for this class teacher.");
      return;
    }

    setCreatingTeacher(true);
    try {
      const secondaryAppName = "secondary-teacher-creator";
      const secondaryApp = getApps().some((app) => app.name === secondaryAppName)
        ? getApp(secondaryAppName)
        : initializeApp(auth.app.options, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);

      const teacherCred = await createUserWithEmailAndPassword(
        secondaryAuth,
        normalizedEmail,
        teacherForm.password
      );

      const uid = teacherCred.user.uid;
      const finalAssignedGroups = Array.from(
        new Set(
          teacherForm.role === "class_teacher" && teacherForm.primaryClassGroup
            ? [...selectedGroups, teacherForm.primaryClassGroup]
            : selectedGroups
        )
      );
      const assignedClasses = Array.from(
        new Set(finalAssignedGroups.map((item) => item.split("__")[0]).filter(Boolean))
      );
      const assignedSections = Array.from(
        new Set(finalAssignedGroups.map((item) => item.split("__")[1]).filter(Boolean))
      );
      const subjects = Array.from(
        new Set([...parseCsv(teacherForm.subjectsText)])
      );

      const teacherDoc = {
        teacherName: teacherForm.teacherName,
        email: normalizedEmail,
        password: teacherForm.password,
        role: teacherForm.role,
        isActive: true,
        mobileNo: teacherForm.mobileNo,
        qualification: teacherForm.qualification,
        notes: teacherForm.notes,
        subjects,
        assignedClasses,
        assignedSections,
        assignedClassGroups: finalAssignedGroups,
        classTeacherOf:
          teacherForm.role === "class_teacher" && teacherForm.primaryClassGroup
            ? [teacherForm.primaryClassGroup]
            : [],
        primaryClassGroup:
          teacherForm.role === "class_teacher" ? teacherForm.primaryClassGroup : "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, "teachers", uid), teacherDoc);
      await setDoc(doc(db, "users", uid), {
        role: teacherForm.role,
        teacherId: uid,
        teacherName: teacherForm.teacherName,
        email: normalizedEmail,
        password: teacherForm.password,
        isActive: true,
        subjects,
        assignedClasses,
        assignedSections,
        assignedClassGroups: finalAssignedGroups,
        classTeacherOf:
          teacherForm.role === "class_teacher" && teacherForm.primaryClassGroup
            ? [teacherForm.primaryClassGroup]
            : [],
        primaryClassGroup:
          teacherForm.role === "class_teacher" ? teacherForm.primaryClassGroup : "",
        updatedAt: serverTimestamp()
      });

      await secondaryAuth.signOut();
      await deleteApp(secondaryApp);

      resetForm();
      await fetchTeachers();
      alert("Teacher account created.");
    } catch (err) {
      console.error(err);
      alert(err.message || "Could not create teacher account.");
    } finally {
      setCreatingTeacher(false);
    }
  };

  const openEditTeacher = (teacher) => {
    setEditingTeacherId(teacher.id);
    setEditTeacherForm({
      teacherName: teacher.teacherName || "",
      role: teacher.role || "teacher",
      mobileNo: teacher.mobileNo || "",
      qualification: teacher.qualification || "",
      subjectsText: Array.isArray(teacher.subjects) ? teacher.subjects.join(", ") : "",
      notes: teacher.notes || "",
      primaryClassGroup:
        teacher.primaryClassGroup ||
        (Array.isArray(teacher.classTeacherOf) ? teacher.classTeacherOf[0] || "" : ""),
      isActive: teacher.isActive !== false
    });
    setEditSelectedGroups(Array.isArray(teacher.assignedClassGroups) ? teacher.assignedClassGroups : []);
  };

  const saveTeacherUpdate = async () => {
    if (!editingTeacherId) return;
    if (!editTeacherForm.teacherName || editSelectedGroups.length === 0) {
      alert("Fill teacher name and assign at least one class group.");
      return;
    }
    if (editTeacherForm.role === "class_teacher" && !editTeacherForm.primaryClassGroup) {
      alert("Select the primary class group for this class teacher.");
      return;
    }

    setSavingTeacherUpdate(true);
    try {
      const finalAssignedGroups = Array.from(
        new Set(
          editTeacherForm.role === "class_teacher" && editTeacherForm.primaryClassGroup
            ? [...editSelectedGroups, editTeacherForm.primaryClassGroup]
            : editSelectedGroups
        )
      );
      const assignedClasses = Array.from(
        new Set(finalAssignedGroups.map((item) => item.split("__")[0]).filter(Boolean))
      );
      const assignedSections = Array.from(
        new Set(finalAssignedGroups.map((item) => item.split("__")[1]).filter(Boolean))
      );
      const subjects = Array.from(new Set(parseCsv(editTeacherForm.subjectsText)));

      const nextData = {
        teacherName: editTeacherForm.teacherName,
        role: editTeacherForm.role,
        mobileNo: editTeacherForm.mobileNo,
        qualification: editTeacherForm.qualification,
        notes: editTeacherForm.notes,
        subjects,
        assignedClasses,
        assignedSections,
        assignedClassGroups: finalAssignedGroups,
        classTeacherOf:
          editTeacherForm.role === "class_teacher" && editTeacherForm.primaryClassGroup
            ? [editTeacherForm.primaryClassGroup]
            : [],
        primaryClassGroup:
          editTeacherForm.role === "class_teacher" ? editTeacherForm.primaryClassGroup : "",
        isActive: editTeacherForm.isActive,
        updatedAt: serverTimestamp()
      };

      await Promise.all([
        setDoc(doc(db, "teachers", editingTeacherId), nextData, { merge: true }),
        setDoc(
          doc(db, "users", editingTeacherId),
          {
            role: editTeacherForm.role,
            teacherName: editTeacherForm.teacherName,
            subjects,
            assignedClasses,
            assignedSections,
            assignedClassGroups: finalAssignedGroups,
            classTeacherOf:
              editTeacherForm.role === "class_teacher" && editTeacherForm.primaryClassGroup
                ? [editTeacherForm.primaryClassGroup]
                : [],
            primaryClassGroup:
              editTeacherForm.role === "class_teacher" ? editTeacherForm.primaryClassGroup : "",
            isActive: editTeacherForm.isActive,
            updatedAt: serverTimestamp()
          },
          { merge: true }
        )
      ]);

      await fetchTeachers();
      resetEditForm();
      alert("Teacher profile updated.");
    } catch (err) {
      console.error(err);
      alert("Could not update teacher profile.");
    } finally {
      setSavingTeacherUpdate(false);
    }
  };

  const toggleTeacherActive = async (teacher) => {
    const nextActive = teacher.isActive === false;
    try {
      await Promise.all([
        setDoc(
          doc(db, "teachers", teacher.id),
          { isActive: nextActive, updatedAt: serverTimestamp() },
          { merge: true }
        ),
        setDoc(
          doc(db, "users", teacher.id),
          { isActive: nextActive, updatedAt: serverTimestamp() },
          { merge: true }
        )
      ]);
      await fetchTeachers();
      if (editingTeacherId === teacher.id) {
        setEditTeacherForm((prev) => ({ ...prev, isActive: nextActive }));
      }
      alert(nextActive ? "Teacher activated." : "Teacher deactivated.");
    } catch (err) {
      console.error(err);
      alert("Could not update teacher status.");
    }
  };

  return (
    <div className="card-soft mt-5 overflow-hidden rounded-[30px] border-slate-200/80 shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-200/60">
            <GraduationCap size={22} />
          </div>
          <div className="space-y-2">
            <div>
              <h2 className="text-[1.85rem] font-bold leading-tight text-slate-900 sm:text-[2rem]">
                Teacher Management
              </h2>
              <p className="mt-1 text-sm text-slate-500 sm:text-[15px]">
                Create teacher login accounts, assign classes, and manage who teaches which group.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatPill icon={GraduationCap} label={`${teacherStats.total} teachers`} />
              <StatPill icon={KeyRound} label={`${teacherStats.active} active`} />
              <StatPill icon={School} label={`${teacherStats.assignedGroups} groups`} />
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSectionToggle}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
          aria-label={
            isOpen
              ? "Collapse Teacher Management section"
              : "Expand Teacher Management section"
          }
        >
          <ChevronDown
            className={`h-5 w-5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {isOpen && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">
                Total Teachers
              </p>
              <p className="mt-2 text-2xl font-bold text-emerald-700">{teacherStats.total}</p>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-600">
                Active Accounts
              </p>
              <p className="mt-2 text-2xl font-bold text-sky-700">{teacherStats.active}</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">
                Class Teachers
              </p>
              <p className="mt-2 text-2xl font-bold text-amber-700">{teacherStats.classTeachers}</p>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
                Covered Groups
              </p>
              <p className="mt-2 text-2xl font-bold text-violet-700">{teacherStats.assignedGroups}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-4 text-sm text-emerald-900">
            <p className="font-semibold">Class-section group ka simple matlab</p>
            <p className="mt-1 leading-6 text-emerald-800">
              Ek <span className="font-semibold">class-section group</span> ka matlab hai ek exact
              teaching combination, jaise <span className="font-semibold">Class 2 (A)</span> ya{" "}
              <span className="font-semibold">Class 3 (B)</span>. Isliye teacher ko wahi groups
              assign karna hai jahan wo actual me padhata hai. Duplicate class names ab clean format
              me merge ho kar hi dikhaye jayenge.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="card-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="card-title">Create Teacher Login</p>
                <p className="mt-1 text-sm text-slate-500">
                  Create login, choose role, and assign the exact class-section groups this teacher handles.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatPill icon={School} label={`${availableGroups.length} class-section groups`} />
                <StatPill icon={KeyRound} label={`${teachers.length} teacher accounts`} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Teacher Name
                </label>
                <input
                  className={inputClass}
                  value={teacherForm.teacherName}
                  onChange={(e) =>
                    setTeacherForm((prev) => ({ ...prev, teacherName: e.target.value }))
                  }
                  placeholder="Enter teacher name"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Role
                </label>
                <select
                  className={inputClass}
                  value={teacherForm.role}
                  onChange={(e) =>
                    setTeacherForm((prev) => ({ ...prev, role: e.target.value }))
                  }
                >
                  <option value="teacher">Teacher</option>
                  <option value="class_teacher">Class Teacher</option>
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  {teacherRoleHelp}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Login Email
                </label>
                <input
                  type="email"
                  className={inputClass}
                  value={teacherForm.email}
                  onChange={(e) =>
                    setTeacherForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="teacher@fluxbabyworld.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Login Password
                </label>
                <input
                  type="text"
                  className={inputClass}
                  value={teacherForm.password}
                  onChange={(e) =>
                    setTeacherForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  placeholder="Teacher password"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Mobile No
                </label>
                <input
                  className={inputClass}
                  value={teacherForm.mobileNo}
                  onChange={(e) =>
                    setTeacherForm((prev) => ({ ...prev, mobileNo: e.target.value }))
                  }
                  placeholder="Teacher mobile number"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Qualification
                </label>
                <input
                  className={inputClass}
                  value={teacherForm.qualification}
                  onChange={(e) =>
                    setTeacherForm((prev) => ({ ...prev, qualification: e.target.value }))
                  }
                  placeholder="B.Ed, M.A, B.Sc..."
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Subjects
              </label>
              <input
                className={inputClass}
                value={teacherForm.subjectsText}
                onChange={(e) =>
                  setTeacherForm((prev) => ({ ...prev, subjectsText: e.target.value }))
                }
                placeholder="English, Maths, Science"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {subjectPresets.map((subject) => (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => {
                      const current = parseCsv(teacherForm.subjectsText);
                      if (current.includes(subject)) return;
                      setTeacherForm((prev) => ({
                        ...prev,
                        subjectsText: [...current, subject].join(", ")
                      }));
                    }}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    {subject}
                  </button>
                ))}
              </div>
            </div>

              <div className="mt-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Assign Teaching Class-Section Groups
                </label>
              <p className="mb-2 text-xs text-slate-500">
                Select every class + section combination this teacher actually teaches.
              </p>
                <div className="max-h-[220px] overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableGroups.map((group) => (
                    <button
                      key={group.key}
                      type="button"
                      onClick={() => toggleGroup(group.key)}
                      className={`rounded-2xl border px-3 py-2 text-left text-sm font-semibold transition ${
                        selectedGroups.includes(group.key)
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      {group.label}
                    </button>
                  ))}
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Selected class-section groups:{" "}
                  <span className="font-semibold text-slate-700">{selectedGroups.length}</span>
                </p>
              </div>

            {teacherForm.role === "class_teacher" && (
              <div className="mt-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Primary Homeroom Class-Section
                </label>
                <p className="mb-2 text-xs text-slate-500">
                  Ye reporting/homeroom class hai. Teacher iske alawa aur assigned groups me bhi padha sakta hai.
                </p>
                <select
                  className={inputClass}
                  value={teacherForm.primaryClassGroup}
                  onChange={(e) =>
                    setTeacherForm((prev) => ({
                      ...prev,
                      primaryClassGroup: e.target.value
                    }))
                  }
                >
                  <option value="">Select primary class-section</option>
                  {availableGroups.map((group) => (
                    <option key={group.key} value={group.key}>
                      {group.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mt-4">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Notes
              </label>
              <textarea
                className={textareaClass}
                value={teacherForm.notes}
                onChange={(e) =>
                  setTeacherForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Optional internal note for admin..."
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={createTeacher}
                disabled={creatingTeacher}
                className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(16,185,129,0.22)] hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60"
              >
                {creatingTeacher ? "Creating..." : "Create Teacher Login"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Reset Form
              </button>
            </div>
          </div>

          <div className="card-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="card-title">Teacher Login Credentials</p>
                <p className="mt-1 text-sm text-slate-500">
                  Share these credentials with teachers for dashboard access.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                {loadingTeachers ? "Loading..." : `${teachers.length} teachers`}
              </span>
            </div>

            <div className="mt-4 max-h-[760px] overflow-auto space-y-3 pr-1">
              {teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">
                        {teacher.teacherName || "Teacher"}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p className="text-xs text-slate-500">
                        {teacher.role === "class_teacher" ? "Class Teacher" : "Teacher"}
                        </p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            teacher.isActive === false
                              ? "bg-rose-100 text-rose-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {teacher.isActive === false ? "Inactive" : "Active"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEditTeacher(teacher)}
                        className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-100"
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleTeacherActive(teacher)}
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border ${
                          teacher.isActive === false
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                        }`}
                      >
                        <Power size={12} />
                        {teacher.isActive === false ? "Activate" : "Deactivate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(teacher.email || "", "Email")}
                        className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-100"
                      >
                        <Copy size={12} />
                        Copy Email
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(teacher.password || "", "Password")}
                        className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-100"
                      >
                        <Copy size={12} />
                        Copy Password
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold">
                        Login Email
                      </p>
                      <p className="mt-2 font-semibold text-slate-800 break-all">
                        {teacher.email || "--"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold">
                        Login Password
                      </p>
                      <p className="mt-2 font-semibold text-slate-800 break-all">
                        {teacher.password || "--"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold">
                        Subjects
                      </p>
                      <p className="mt-2 font-semibold text-slate-800">
                        {teacher.subjects?.length
                          ? teacher.subjects.join(", ")
                          : "Not assigned"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold">
                        Teaching Class-Section Groups
                      </p>
                      <p className="mt-2 font-semibold text-slate-800">
                        {teacher.assignedClassGroups?.length
                          ? Array.from(
                              new Set(
                                teacher.assignedClassGroups.map((item) => formatGroupLabel(item))
                              )
                            )
                              .join(", ")
                          : "Not assigned"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold">
                        Primary Homeroom Group
                      </p>
                        <p className="mt-2 font-semibold text-slate-800">
                        {teacher.primaryClassGroup
                          ? formatGroupLabel(teacher.primaryClassGroup)
                          : teacher.classTeacherOf?.[0]
                            ? formatGroupLabel(teacher.classTeacherOf[0])
                            : teacher.role === "class_teacher"
                              ? "Not selected"
                              : "Not applicable"}
                      </p>
                    </div>
                  </div>

                  {(teacher.mobileNo || teacher.qualification || teacher.notes) && (
                    <div className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                      {teacher.mobileNo && (
                        <p>
                          <span className="font-semibold text-slate-800">Mobile:</span>{" "}
                          {teacher.mobileNo}
                        </p>
                      )}
                      {teacher.qualification && (
                        <p className="mt-1">
                          <span className="font-semibold text-slate-800">Qualification:</span>{" "}
                          {teacher.qualification}
                        </p>
                      )}
                      {teacher.notes && (
                        <p className="mt-1">
                          <span className="font-semibold text-slate-800">Notes:</span>{" "}
                          {teacher.notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {!loadingTeachers && teachers.length === 0 && (
                <p className="text-sm text-slate-500">
                  No teacher accounts created yet.
                </p>
              )}
            </div>
          </div>
        </div>
        </div>
      )}

      {editingTeacherId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-2xl font-bold text-slate-900">Edit Teacher</p>
                <p className="mt-1 text-sm text-slate-500">
                  Update assignments, primary class, notes, and activation status.
                </p>
              </div>
              <button
                type="button"
                onClick={resetEditForm}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Teacher Name
                </label>
                <input
                  className={inputClass}
                  value={editTeacherForm.teacherName}
                  onChange={(e) =>
                    setEditTeacherForm((prev) => ({ ...prev, teacherName: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Role
                </label>
                <select
                  className={inputClass}
                  value={editTeacherForm.role}
                  onChange={(e) =>
                    setEditTeacherForm((prev) => ({
                      ...prev,
                      role: e.target.value,
                      primaryClassGroup:
                        e.target.value === "class_teacher" ? prev.primaryClassGroup : ""
                    }))
                  }
                >
                  <option value="teacher">Teacher</option>
                  <option value="class_teacher">Class Teacher</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Mobile No
                </label>
                <input
                  className={inputClass}
                  value={editTeacherForm.mobileNo}
                  onChange={(e) =>
                    setEditTeacherForm((prev) => ({ ...prev, mobileNo: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Qualification
                </label>
                <input
                  className={inputClass}
                  value={editTeacherForm.qualification}
                  onChange={(e) =>
                    setEditTeacherForm((prev) => ({ ...prev, qualification: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Subjects
              </label>
              <input
                className={inputClass}
                value={editTeacherForm.subjectsText}
                onChange={(e) =>
                  setEditTeacherForm((prev) => ({ ...prev, subjectsText: e.target.value }))
                }
                placeholder="English, Maths, Science"
              />
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Reassign Teaching Class-Section Groups
              </label>
              <div className="max-h-[220px] overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {availableGroups.map((group) => (
                    <button
                      key={group.key}
                      type="button"
                      onClick={() => toggleEditGroup(group.key)}
                      className={`rounded-2xl border px-3 py-2 text-left text-sm font-semibold transition ${
                        editSelectedGroups.includes(group.key)
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      {group.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {editTeacherForm.role === "class_teacher" && (
              <div className="mt-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Primary Homeroom Class-Section
                </label>
                <select
                  className={inputClass}
                  value={editTeacherForm.primaryClassGroup}
                  onChange={(e) =>
                    setEditTeacherForm((prev) => ({
                      ...prev,
                      primaryClassGroup: e.target.value
                    }))
                  }
                >
                  <option value="">Select primary class-section</option>
                  {availableGroups.map((group) => (
                    <option key={group.key} value={group.key}>
                      {group.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Notes
                </label>
                <textarea
                  className={textareaClass}
                  value={editTeacherForm.notes}
                  onChange={(e) =>
                    setEditTeacherForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                />
              </div>
              <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={editTeacherForm.isActive}
                  onChange={(e) =>
                    setEditTeacherForm((prev) => ({ ...prev, isActive: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Teacher account active
              </label>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={resetEditForm}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveTeacherUpdate}
                disabled={savingTeacherUpdate}
                className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(16,185,129,0.22)] hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60"
              >
                {savingTeacherUpdate ? "Updating..." : "Update Teacher"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
