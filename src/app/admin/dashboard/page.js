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
import Navbar from "@/app/components/admin/navbar";
import AddStudentCard from "@/app/components/admin/add-student-card";
import StudentsFeesList from "@/app/components/admin/students-fees-list";
import AdmitCardSection from "@/app/components/admin/admit-card-section";

export default function AdminDashboard() {
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState("");

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
    if (
      !name ||
      !studentClass ||
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
        class: studentClass,
        section,
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
    const nextData = { ...profileData };

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
        <h1 className="text-2xl sm:text-3xl font-bold text-indigo-700 mb-6">
          Admin Dashboard - Flux Baby World
        </h1>

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
        />

        <StudentsFeesList
          students={students}
          onFetchMonthlyFees={fetchMonthlyFees}
          onSaveMonthlyFees={saveMonthlyFees}
          onUpdateStudent={updateStudentProfile}
          onDeleteStudent={deleteStudent}
        />

        <AdmitCardSection
          students={students}
          onFetchMonthlyFees={fetchMonthlyFees}
        />
      </div>
    </div>
  );
}
