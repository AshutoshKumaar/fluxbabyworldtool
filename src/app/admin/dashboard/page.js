"use client";

import { useEffect, useState } from "react";
import { db, auth, storage } from "../../../lib/firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import Navbar from "@/app/components/admin/navbar";
import AddStudentCard from "@/app/components/admin/add-student-card";
import StudentsFeesList from "@/app/components/admin/students-fees-list";
import AdmitCardSection from "@/app/components/admin/admit-card-section";

export default function AdminDashboard() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Student fields
  const [name, setName] = useState("");
  const [studentClass, setStudentClass] = useState("");
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
    setStudents(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

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

    try {
      // Create parent auth account
      const parentCred = await createUserWithEmailAndPassword(
        auth,
        parentEmail,
        parentPassword
      );

      const parentUid = parentCred.user.uid;

      const studentRef = doc(collection(db, "students"));
      const studentId = studentRef.id;
      let uploadedPhotoUrl = "";

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

      // Create student
      await setDoc(studentRef, {
        name,
        class: studentClass,
        rollNo,
        dob,
        fatherName,
        motherName,
        gender,
        bloodGroup,
        contactNo,
        address,
        photoUrl: uploadedPhotoUrl,
        parentUid
      });

      // Create user role doc
      await setDoc(doc(db, "users", parentUid), {
        role: "parent",
        studentId: studentRef.id
      });

      alert("Student & Parent login created");
      fetchStudents();

      // reset
      setName("");
      setStudentClass("");
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
      setUploadProgress(0);
      setIsUploading(false);
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
    const { month, year, totalFees, paidFees } = input || {};

    if (!month || !year || !totalFees || !paidFees) {
      alert("Enter month, year, total and paid fees");
      return;
    }

    const dueFees = Number(totalFees) - Number(paidFees);
    const monthId = `${year}-${String(month).padStart(2, "0")}`;

    await setDoc(
      doc(db, "fees", studentId, "months", monthId),
      {
        month: Number(month),
        year: Number(year),
        totalFees: Number(totalFees),
        paidFees: Number(paidFees),
        dueFees,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
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
        />

        <AdmitCardSection
          students={students}
          onFetchMonthlyFees={fetchMonthlyFees}
        />
      </div>
    </div>
  );
}
