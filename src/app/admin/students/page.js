"use client";

import { useEffect, useState } from "react";
import { initializeApp, deleteApp, getApp, getApps } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signOut
} from "firebase/auth";
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db, storage } from "../../../lib/firebase";
import Navbar from "@/app/components/admin/navbar";
import AddStudentCard from "@/app/components/admin/add-student-card";

export default function AdminStudentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState("");

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
  const [parentEmail, setParentEmail] = useState("");
  const [parentPassword, setParentPassword] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      try {
        const roleSnap = await getDoc(doc(db, "users", user.uid));
        if (roleSnap.data()?.role !== "admin") {
          setAccessError("Only admin users can access this page.");
          await signOut(auth);
          return;
        }
      } catch (err) {
        console.error(err);
        setAccessError("Failed to verify admin access.");
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [router]);

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
      const secondaryAppName = "secondary-parent-creator";
      const secondaryApp = getApps().some((app) => app.name === secondaryAppName)
        ? getApp(secondaryAppName)
        : initializeApp(auth.app.options, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);

      const parentCred = await createUserWithEmailAndPassword(
        secondaryAuth,
        parentEmail,
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
        const fileRef = ref(storage, `students/${studentId}/photo-${Date.now()}-${photoFile.name}`);
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
        uploadedDocuments.push({ type: item.type, fileName: item.file.name, url });
      }

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
        parentUid
      });

      await setDoc(doc(db, "users", parentUid), {
        role: "parent",
        studentId: studentRef.id
      });

      await secondaryAuth.signOut();
      await deleteApp(secondaryApp);

      alert("Student & Parent login created");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100">
        <Navbar role="admin" />
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
          Students - Flux Baby World
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
      </div>
    </div>
  );
}

