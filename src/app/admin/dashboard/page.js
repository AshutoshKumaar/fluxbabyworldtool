"use client";

import { useEffect, useState } from "react";
import { db, auth, storage } from "../../../lib/firebase";
import { initializeApp, deleteApp, getApp, getApps } from "firebase/app";
import {
  collection,
  deleteDoc,
  getDoc,
  getDocs,
  doc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signOut
} from "firebase/auth";
import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL
} from "firebase/storage";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  FileBadge2,
  FileSpreadsheet,
  GraduationCap,
  ReceiptIndianRupee,
  ShieldCheck,
  UserPlus,
  Users
} from "lucide-react";
import Navbar from "@/app/components/admin/navbar";
import AddStudentCard from "@/app/components/admin/add-student-card";
import StudentsFeesList from "@/app/components/admin/students-fees-list";
import AdmitCardSection from "@/app/components/admin/admit-card-section";
import TransferCertificateSection from "@/app/components/admin/transfer-certificate-section";
import MarksheetSection from "@/app/components/admin/marksheet-section";
import TeacherManagementSection from "@/app/components/admin/teacher-management-section";
import AcademicMonitorSection from "@/app/components/admin/academic-monitor-section";
import { normalizeSchoolClass, normalizeSection } from "@/lib/school-classes";

const adminSectionMeta = [
  {
    key: "add-student",
    label: "Admissions",
    title: "Add Student & Parent Login",
    helper: "Create student profiles, upload documents, and share parent access.",
    icon: UserPlus,
    accent: "from-indigo-500 to-violet-600"
  },
  {
    key: "teacher-management",
    label: "Teachers",
    title: "Teacher Management",
    helper: "Create teacher logins, assign classes, and manage primary homeroom ownership.",
    icon: GraduationCap,
    accent: "from-emerald-500 to-teal-600"
  },
  {
    key: "academic-monitor",
    label: "Monitoring",
    title: "Academic Monitoring",
    helper: "Review teacher attendance, homework, and class-wide reports in one place.",
    icon: ShieldCheck,
    accent: "from-sky-500 to-cyan-600"
  },
  {
    key: "students-fees",
    label: "Profiles & Fees",
    title: "Students & Fees",
    helper: "Search students, edit details, and manage monthly fee records cleanly.",
    icon: Users,
    accent: "from-teal-500 to-emerald-600"
  },
  {
    key: "admit-card",
    label: "Exams",
    title: "Admit Card Issuance",
    helper: "Prepare exam schedules, payment overrides, and admit-card downloads.",
    icon: BadgeCheck,
    accent: "from-violet-500 to-indigo-600"
  },
  {
    key: "marksheet",
    label: "Report Card",
    title: "Marksheet / Report Card",
    helper: "Create dynamic report cards and printable results for each student.",
    icon: FileSpreadsheet,
    accent: "from-rose-500 to-orange-500"
  },
  {
    key: "transfer-certificate",
    label: "Certificates",
    title: "Transfer Certificate",
    helper: "Generate formal TC documents and keep them ready for download.",
    icon: FileBadge2,
    accent: "from-amber-500 to-orange-500"
  }
];

export default function AdminDashboard() {
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState("");
  const [activeSection, setActiveSection] = useState("add-student");

  // Student fields
  const [name, setName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [section, setSection] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [dob, setDob] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [gender, setGender] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [address, setAddress] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [transportMode, setTransportMode] = useState("on-foot");

  // Parent login fields
  const [parentEmail, setParentEmail] = useState("");
  const [parentPassword, setParentPassword] = useState("");

  // Fetch students
  const fetchStudents = async () => {
    const snap = await getDocs(collection(db, "students"));
    const data = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    const enriched = await Promise.all(
      data.map(async (student) => {
        if ((student.parentEmail && student.parentPassword) || !student.parentUid) {
          return student;
        }
        try {
          const userSnap = await getDoc(doc(db, "users", student.parentUid));
          return {
            ...student,
            parentEmail: student.parentEmail || userSnap.data()?.parentEmail || "",
            parentPassword: student.parentPassword || userSnap.data()?.parentPassword || ""
          };
        } catch {
          return student;
        }
      })
    );
    setStudents(enriched);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const roleSnap = await getDoc(doc(db, "users", user.uid));
        const role = roleSnap.data()?.role;

        if (role !== "admin") {
          setAccessError("Only admin users can access this dashboard.");
          await signOut(auth);
          return;
        }

        await fetchStudents();
      } catch (err) {
        console.error(err);
        setAccessError("Failed to verify admin access. Please login again.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  // Add student + parent login
  const addStudent = async () => {
    const normalizedClass = normalizeSchoolClass(studentClass);
    const normalizedSection = normalizeSection(section);
    if (
      !name ||
      !normalizedClass ||
      !rollNo ||
      !dob ||
      !fatherName ||
      !parentEmail ||
      !parentPassword
    ) {
      alert("Fill all required student & parent details");
      return;
    }
    if (
      documents.some((item) => (item.type && !item.file) || (!item.type && item.file))
    ) {
      alert("Complete all document rows or remove incomplete ones.");
      return;
    }

    try {
      const normalizedParentEmail = String(parentEmail).trim().toLowerCase();
      // Create parent auth account using a secondary app so admin session
      // does not switch to the newly created parent user.
      const secondaryAppName = "secondary-parent-creator";
      const secondaryApp = getApps().some((app) => app.name === secondaryAppName)
        ? getApp(secondaryAppName)
        : initializeApp(auth.app.options, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);

      const parentCred = await createUserWithEmailAndPassword(
        secondaryAuth,
        normalizedParentEmail,
        parentPassword
      );

      const parentUid = parentCred.user.uid;

      const studentRef = doc(collection(db, "students"));
      const studentId = studentRef.id;
      let uploadedPhotoUrl = "";
      const uploadedDocuments = [];

      if (photoFile) {
        setIsUploading(true);
        setUploadProgress(0);
        const fileRef = ref(
          storage,
          `students/${studentId}/photo-${Date.now()}-${photoFile.name}`
        );
        const uploadTask = uploadBytesResumable(fileRef, photoFile);

        await new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress = Math.round(
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              );
              setUploadProgress(progress);
            },
            reject,
            () => resolve()
          );
        });

        uploadedPhotoUrl = await getDownloadURL(uploadTask.snapshot.ref);
      }

      for (const item of documents) {
        if (!item?.type || !item?.file) continue;
        const docRef = ref(
          storage,
          `students/${studentId}/documents/${item.type}-${Date.now()}-${item.file.name}`
        );
        await uploadBytes(docRef, item.file);
        const url = await getDownloadURL(docRef);
        uploadedDocuments.push({
          type: item.type,
          fileName: item.file.name,
          url
        });
      }

      // Create student
      await setDoc(studentRef, {
        name,
        class: normalizedClass,
        section: normalizedSection,
        rollNo,
        dob,
        fatherName,
        motherName,
        gender,
        bloodGroup,
        contactNo,
        address,
        photoUrl: uploadedPhotoUrl,
        documents: uploadedDocuments,
        transportMode,
        parentUid,
        parentEmail: normalizedParentEmail,
        parentPassword
      });

      // Create user role doc
      await setDoc(doc(db, "users", parentUid), {
        role: "parent",
        studentId: studentRef.id,
        parentEmail: normalizedParentEmail,
        parentPassword
      });

      await secondaryAuth.signOut();
      await deleteApp(secondaryApp);

      alert("Student & Parent login created");
      fetchStudents();

      // reset
      setName("");
      setStudentClass("");
      setSection("");
      setRollNo("");
      setDob("");
      setFatherName("");
      setMotherName("");
      setGender("");
      setBloodGroup("");
      setContactNo("");
      setAddress("");
      setPhotoFile(null);
      setPhotoInputKey((key) => key + 1);
      setDocuments([]);
      setUploadProgress(0);
      setIsUploading(false);
      setTransportMode("on-foot");
      setParentEmail("");
      setParentPassword("");
    } catch (err) {
      console.error(err);
      alert(err.message);
      setIsUploading(false);
    }
  };

  const fetchMonthlyFees = async (studentId) => {
    const snap = await getDocs(
      collection(db, "fees", studentId, "months")
    );
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ];

    const data = snap.docs.map((docSnap) => {
      const record = docSnap.data();
      return {
        id: docSnap.id,
        ...record,
        monthName: monthNames[(record.month || 1) - 1] || "Month"
      };
    });

    return data.sort((a, b) => {
      if (a.year !== b.year) {
        return b.year - a.year;
      }
      return b.month - a.month;
    });
  };

  const saveMonthlyFees = async (studentId, input) => {
    const { month, year, totalFees, paidFees, transportFee } = input || {};

    if (
      !month ||
      !year ||
      totalFees === "" ||
      totalFees === null ||
      totalFees === undefined ||
      paidFees === "" ||
      paidFees === null ||
      paidFees === undefined
    ) {
      alert("Enter month, year, tuition and paid fees");
      return;
    }

    const transport = Number(transportFee || 0);
    const netTotalFees = Number(totalFees) + transport;
    const dueFees = netTotalFees - Number(paidFees);
    const monthId = `${year}-${String(month).padStart(2, "0")}`;

    await setDoc(
      doc(db, "fees", studentId, "months", monthId),
      {
        month: Number(month),
        year: Number(year),
        totalFees: Number(totalFees),
        transportFee: transport,
        netTotalFees,
        paidFees: Number(paidFees),
        dueFees,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  };

  const updateStudentProfile = async (studentId, profileData, newPhotoFile, newDocuments) => {
    const nextData = {
      ...profileData,
      class: normalizeSchoolClass(profileData.class),
      section: normalizeSection(profileData.section)
    };

    if (newPhotoFile) {
      const photoRef = ref(
        storage,
        `students/${studentId}/photo-${Date.now()}-${newPhotoFile.name}`
      );
      await uploadBytes(photoRef, newPhotoFile);
      nextData.photoUrl = await getDownloadURL(photoRef);
    }

    const uploadedDocs = [];
    for (const item of newDocuments || []) {
      if (!item?.type || !item?.file) continue;
      const docRef = ref(
        storage,
        `students/${studentId}/documents/${item.type}-${Date.now()}-${item.file.name}`
      );
      await uploadBytes(docRef, item.file);
      const url = await getDownloadURL(docRef);
      uploadedDocs.push({
        type: item.type,
        fileName: item.file.name,
        url
      });
    }

    nextData.documents = [...(profileData.documents || []), ...uploadedDocs];
    await setDoc(doc(db, "students", studentId), nextData, { merge: true });

    if (profileData?.parentUid) {
      await setDoc(
        doc(db, "users", profileData.parentUid),
        {
          parentEmail: profileData.parentEmail || "",
          parentPassword: profileData.parentPassword || ""
        },
        { merge: true }
      );
    }
    await fetchStudents();
  };

  const deleteStudent = async (student) => {
    if (!student?.id) return;
    const ok = window.confirm(
      `Delete ${student.name || "this student"} permanently? This will remove student profile and fee records.`
    );
    if (!ok) return;

    try {
      const studentId = student.id;
      const parentUid = student.parentUid;

      const monthsSnap = await getDocs(collection(db, "fees", studentId, "months"));
      await Promise.all(
        monthsSnap.docs.map((monthDoc) =>
          deleteDoc(doc(db, "fees", studentId, "months", monthDoc.id))
        )
      );

      await Promise.all([
        deleteDoc(doc(db, "fees", studentId)),
        deleteDoc(doc(db, "students", studentId)),
        parentUid ? deleteDoc(doc(db, "users", parentUid)) : Promise.resolve()
      ]);

      alert("Student deleted successfully.");
      await fetchStudents();
    } catch (err) {
      console.error(err);
      alert("Could not delete student. Please retry.");
    }
  };

  const toggleSection = (sectionKey) => {
    setActiveSection((prev) => (prev === sectionKey ? "" : sectionKey));
  };

  const activeSectionMeta = adminSectionMeta.find(
    (section) => section.key === activeSection
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case "add-student":
        return (
          <AddStudentCard
            name={name}
            setName={setName}
            studentClass={studentClass}
            setStudentClass={setStudentClass}
            section={section}
            setSection={setSection}
            rollNo={rollNo}
            setRollNo={setRollNo}
            dob={dob}
            setDob={setDob}
            fatherName={fatherName}
            setFatherName={setFatherName}
            motherName={motherName}
            setMotherName={setMotherName}
            gender={gender}
            setGender={setGender}
            bloodGroup={bloodGroup}
            setBloodGroup={setBloodGroup}
            contactNo={contactNo}
            setContactNo={setContactNo}
            address={address}
            setAddress={setAddress}
            photoFile={photoFile}
            setPhotoFile={setPhotoFile}
            photoInputKey={photoInputKey}
            uploadProgress={uploadProgress}
            isUploading={isUploading}
            documents={documents}
            setDocuments={setDocuments}
            transportMode={transportMode}
            setTransportMode={setTransportMode}
            parentEmail={parentEmail}
            setParentEmail={setParentEmail}
            parentPassword={parentPassword}
            setParentPassword={setParentPassword}
            onAddStudent={addStudent}
            isOpen
            onToggle={() => toggleSection("add-student")}
          />
        );
      case "teacher-management":
        return (
          <TeacherManagementSection
            students={students}
            isOpen
            onToggle={() => toggleSection("teacher-management")}
          />
        );
      case "academic-monitor":
        return (
          <AcademicMonitorSection
            students={students}
            isOpen
            onToggle={() => toggleSection("academic-monitor")}
          />
        );
      case "students-fees":
        return (
          <StudentsFeesList
            students={students}
            onFetchMonthlyFees={fetchMonthlyFees}
            onSaveMonthlyFees={saveMonthlyFees}
            onUpdateStudent={updateStudentProfile}
            onDeleteStudent={deleteStudent}
            isOpen
            onToggle={() => toggleSection("students-fees")}
          />
        );
      case "admit-card":
        return (
          <AdmitCardSection
            students={students}
            onFetchMonthlyFees={fetchMonthlyFees}
            isOpen
            onToggle={() => toggleSection("admit-card")}
          />
        );
      case "marksheet":
        return (
          <MarksheetSection
            students={students}
            isOpen
            onToggle={() => toggleSection("marksheet")}
          />
        );
      case "transfer-certificate":
        return (
          <TransferCertificateSection
            students={students}
            isOpen
            onToggle={() => toggleSection("transfer-certificate")}
          />
        );
      default:
        return (
          <div className="card-soft flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-[30px] text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <ReceiptIndianRupee size={28} />
            </div>
            <div>
              <p className="text-xl font-semibold text-slate-900">
                Select a workspace
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Choose a module from the left to continue managing school operations.
              </p>
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100">
        <Navbar role="admin" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-indigo-200" />
              <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-slate-800">
                Loading admin dashboard
              </p>
              <p className="text-sm text-slate-500">
                Fetching students and fees...
              </p>
            </div>
            <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="card-soft h-28 animate-pulse" />
              <div className="card-soft h-28 animate-pulse" />
              <div className="card-soft h-36 animate-pulse sm:col-span-2" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (accessError) {
    return (
      <div className="min-h-screen bg-slate-100">
        <Navbar role="admin" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="card-soft p-6 text-center">
            <p className="text-rose-600 font-semibold">{accessError}</p>
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
    <div className="bg-slate-100 min-h-screen">
      <Navbar role="admin" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="card-soft rounded-[32px] border-slate-200/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,250,252,0.9))] shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-400">
                Admin Workspace
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                School operations without the long scrolling
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
                Choose one workspace at a time, complete the task cleanly, and keep the dashboard
                focused instead of stacking every big module on the same page.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[360px]">
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">
                  Students
                </p>
                <p className="mt-2 text-2xl font-bold text-indigo-700">{students.length}</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-500">
                  Active Module
                </p>
                <p className="mt-2 text-sm font-bold text-emerald-700">
                  {activeSectionMeta?.label || "None"}
                </p>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-500">
                  Teachers
                </p>
                <p className="mt-2 text-sm font-bold text-sky-700">
                  Login + attendance
                </p>
              </div>
              <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-500">
                  Documents
                </p>
                <p className="mt-2 text-sm font-bold text-violet-700">
                  Admit, TC, report card
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-7 grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-4 xl:sticky xl:top-28 self-start">
            <div className="card-soft rounded-[28px] border-slate-200/70">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Modules
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Open only the workspace you want to use.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                  {adminSectionMeta.length} sections
                </span>
              </div>

              <div className="mt-4 space-y-2.5">
                {adminSectionMeta.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.key;
                  return (
                    <button
                      key={section.key}
                      type="button"
                      onClick={() => setActiveSection(section.key)}
                      className={`group flex w-full items-start gap-3 rounded-2xl border px-4 py-4 text-left transition ${
                        isActive
                          ? "border-slate-900 bg-slate-900 text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)]"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${section.accent} text-white shadow-md shadow-slate-200/70`}
                      >
                        <Icon size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold ${isActive ? "text-white" : "text-slate-900"}`}>
                          {section.title}
                        </p>
                        <p
                          className={`mt-1 text-xs leading-5 ${
                            isActive ? "text-white/75" : "text-slate-500"
                          }`}
                        >
                          {section.helper}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <div className="min-w-0 space-y-6">
            {activeSectionMeta && (
              <div className="rounded-[28px] border border-slate-200/70 bg-white/90 px-5 py-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Current Workspace
                    </p>
                    <p className="mt-2 text-xl font-bold text-slate-900">
                      {activeSectionMeta.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {activeSectionMeta.helper}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection("")}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Close workspace
                  </button>
                </div>
              </div>
            )}

            {renderActiveSection()}
          </div>
        </div>
      </div>
    </div>
  );
}
