"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  BookOpenCheck,
  CalendarDays,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  ScanLine,
  UserSquare2
} from "lucide-react";
import { auth, db } from "../../../lib/firebase";
import TeacherNavbar from "@/app/components/teacher/navbar";

const attendanceStatuses = ["present", "absent", "late", "leave"];
const teacherAttendanceStatuses = ["present", "late", "leave"];

const toInputDate = (value = new Date()) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const normalizeList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return [String(value).trim()].filter(Boolean);
};

const classSectionKey = (className, section) =>
  `${String(className || "").trim()}__${String(section || "").trim()}`;

const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadius * c);
};

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="card-soft">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`h-12 w-12 rounded-2xl ${accent} text-white flex items-center justify-center shadow-sm`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function StatusPill({ value }) {
  const map = {
    present: "bg-emerald-100 text-emerald-700",
    late: "bg-amber-100 text-amber-700",
    leave: "bg-slate-200 text-slate-700",
    absent: "bg-rose-100 text-rose-700"
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${map[value] || "bg-slate-100 text-slate-600"}`}>
      {value || "--"}
    </span>
  );
}

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUid, setCurrentUid] = useState("");

  const [role, setRole] = useState("teacher");
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [students, setStudents] = useState([]);

  const [selectedClassKey, setSelectedClassKey] = useState("");
  const [studentAttendanceDate, setStudentAttendanceDate] = useState(
    toInputDate(new Date())
  );
  const [studentAttendanceMap, setStudentAttendanceMap] = useState({});
  const [savingStudentAttendance, setSavingStudentAttendance] = useState(false);

  const [teacherAttendanceDate, setTeacherAttendanceDate] = useState(
    toInputDate(new Date())
  );
  const [teacherAttendanceStatus, setTeacherAttendanceStatus] = useState("present");
  const [teacherAttendanceNote, setTeacherAttendanceNote] = useState("");
  const [savingTeacherAttendance, setSavingTeacherAttendance] = useState(false);
  const [teacherAttendanceRecord, setTeacherAttendanceRecord] = useState(null);
  const [attendancePolicy, setAttendancePolicy] = useState(null);
  const [attendanceQrInput, setAttendanceQrInput] = useState("");
  const [geoCheck, setGeoCheck] = useState({
    checked: false,
    withinRadius: false,
    distanceMeters: null,
    latitude: null,
    longitude: null,
    error: ""
  });
  const [checkingGeo, setCheckingGeo] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanFrameRef = useRef(null);

  const [homeworkClassKey, setHomeworkClassKey] = useState("");
  const [homeworkForm, setHomeworkForm] = useState({
    subject: "",
    title: "",
    description: "",
    dueDate: toInputDate(new Date(Date.now() + 86400000))
  });
  const [homeworkItems, setHomeworkItems] = useState([]);
  const [savingHomework, setSavingHomework] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        setCurrentUid(user.uid);
        const userSnap = await getDoc(doc(db, "users", user.uid));
        const userRole = userSnap.data()?.role;
        const isActive = userSnap.data()?.isActive !== false;

        if (userRole !== "teacher" && userRole !== "class_teacher") {
          setError("Only teacher accounts can access this dashboard.");
          await signOut(auth);
          router.replace("/login");
          return;
        }
        if (!isActive) {
          setError("Teacher account is inactive. Contact school admin.");
          await signOut(auth);
          router.replace("/login");
          return;
        }

        setRole(userRole);

        const teacherSnap = await getDoc(doc(db, "teachers", user.uid));
        const policySnap = await getDoc(doc(db, "settings", "teacherAttendancePolicy"));
        const baseUserData = userSnap.data() || {};
        const teacherData = teacherSnap.exists()
          ? { ...baseUserData, ...teacherSnap.data() }
          : baseUserData;

        setTeacherProfile({
          uid: user.uid,
          teacherName: teacherData.teacherName || user.displayName || "Teacher",
          subjects: normalizeList(teacherData.subjects),
          assignedClassGroups: normalizeList(teacherData.assignedClassGroups),
          assignedClasses: normalizeList(teacherData.assignedClasses),
          assignedSections: normalizeList(teacherData.assignedSections),
          classTeacherOf: normalizeList(
            teacherData.classTeacherOf || teacherData.classTeacherClass
          ),
          primaryClassGroup:
            String(
              teacherData.primaryClassGroup ||
                normalizeList(teacherData.classTeacherOf || teacherData.classTeacherClass)[0] ||
                ""
            ).trim()
        });
        setAttendancePolicy(
          policySnap.exists()
            ? {
                enforceGeo: policySnap.data()?.enforceGeo !== false,
                requireQr: policySnap.data()?.requireQr !== false,
                schoolLatitude: Number(policySnap.data()?.schoolLatitude || 0),
                schoolLongitude: Number(policySnap.data()?.schoolLongitude || 0),
                radiusMeters: Number(policySnap.data()?.radiusMeters || 150),
                schoolWifiName: policySnap.data()?.schoolWifiName || "",
                officeQrCode:
                  policySnap.data()?.officeQrCode || policySnap.data()?.dailyQrCode || ""
              }
            : {
                enforceGeo: false,
                requireQr: false,
                schoolLatitude: 0,
                schoolLongitude: 0,
                radiusMeters: 150,
                schoolWifiName: "",
                officeQrCode: ""
              }
        );

        const studentsSnap = await getDocs(collection(db, "students"));
        const allStudents = studentsSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }));

        const allowedClassSection = new Set();
        normalizeList(teacherData.assignedClassGroups).forEach((item) => {
          const [cls = "", sec = ""] = String(item).split("__");
          if (!cls) return;
          allowedClassSection.add(classSectionKey(cls, sec));
        });
        normalizeList(teacherData.classTeacherOf || teacherData.classTeacherClass).forEach((item) => {
          const [cls = "", sec = ""] = String(item).split("__");
          if (!cls) return;
          allowedClassSection.add(classSectionKey(cls, sec));
        });

        const assignedClasses = normalizeList(teacherData.assignedClasses);
        const assignedSections = normalizeList(teacherData.assignedSections);

        const hasAssignments =
          allowedClassSection.size > 0 ||
          assignedClasses.length > 0 ||
          assignedSections.length > 0;

        const filteredStudents = allStudents.filter((student) => {
          const key = classSectionKey(student.class, student.section);
          if (allowedClassSection.size && allowedClassSection.has(key)) return true;
          if (assignedClasses.length && !assignedClasses.includes(String(student.class || ""))) {
            return false;
          }
          if (assignedSections.length && !assignedSections.includes(String(student.section || ""))) {
            return false;
          }
          return assignedClasses.length > 0 || assignedSections.length > 0
            ? true
            : false;
        });

        const finalStudents = hasAssignments ? filteredStudents : [];
        setStudents(finalStudents);

        const classKeys = Array.from(
          new Set(
            finalStudents.map((student) => classSectionKey(student.class, student.section))
          )
        ).filter(Boolean);

        if (classKeys[0]) {
          setSelectedClassKey(classKeys[0]);
          setHomeworkClassKey(classKeys[0]);
        }

        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Could not load teacher dashboard.");
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  const classOptions = useMemo(
    () =>
      Array.from(
        new Set(students.map((student) => classSectionKey(student.class, student.section)))
      ).filter(Boolean),
    [students]
  );

  const selectedStudents = useMemo(() => {
    if (!selectedClassKey) return [];
    const [className, sectionName] = selectedClassKey.split("__");
    return students.filter(
      (student) =>
        String(student.class || "") === className &&
        String(student.section || "") === sectionName
    );
  }, [students, selectedClassKey]);

  const isQrRequired = attendancePolicy?.requireQr && !!attendancePolicy?.officeQrCode;
  const isQrVerified = !isQrRequired || attendanceQrInput === attendancePolicy?.officeQrCode;
  const isGeoRequired = !!attendancePolicy?.enforceGeo;
  const isGeoVerified = !isGeoRequired || geoCheck.withinRadius;
  const attendanceReadyForSubmit = isQrVerified && isGeoVerified;
  const officeQrPayload = useMemo(() => {
    if (!attendancePolicy?.officeQrCode) return "";
    return `FBW-TEACHER-ATTENDANCE|OFFICE|${attendancePolicy.officeQrCode}`;
  }, [attendancePolicy?.officeQrCode]);

  const stopQrScanner = () => {
    if (scanFrameRef.current) {
      cancelAnimationFrame(scanFrameRef.current);
      scanFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause?.();
      videoRef.current.srcObject = null;
    }
  };

  const parseScannedQrValue = (value) => {
    const rawValue = String(value || "").trim();
    if (!rawValue) return "";
    if (rawValue === attendancePolicy?.officeQrCode) return attendancePolicy.officeQrCode;
    if (rawValue === officeQrPayload) return attendancePolicy?.officeQrCode || "";
    if (rawValue.startsWith("FBW-TEACHER-ATTENDANCE|OFFICE|")) {
      return rawValue.split("|").slice(2).join("|").trim();
    }
    return "";
  };

  const fetchStudentAttendance = async () => {
    if (!selectedClassKey || !studentAttendanceDate) return;
    try {
      const attendanceId = `${studentAttendanceDate}_${selectedClassKey}`;
      const snap = await getDoc(doc(db, "studentAttendance", attendanceId));
      setStudentAttendanceMap(snap.data()?.records || {});
    } catch (err) {
      console.error(err);
      setStudentAttendanceMap({});
    }
  };

  const fetchTeacherAttendance = async () => {
    if (!currentUid || !teacherAttendanceDate) return;
    try {
      const attendanceId = `${currentUid}_${teacherAttendanceDate}`;
      const snap = await getDoc(doc(db, "teacherAttendance", attendanceId));
      const record = snap.data() || null;
      setTeacherAttendanceRecord(record);
      if (record) {
        setTeacherAttendanceStatus(record.status || "present");
        setTeacherAttendanceNote(record.note || "");
        setAttendanceQrInput(record.qrCode || "");
        setGeoCheck({
          checked: !!record.geoCheck?.checked,
          withinRadius: !!record.geoCheck?.withinRadius,
          distanceMeters:
            record.geoCheck?.distanceMeters === 0 || record.geoCheck?.distanceMeters
              ? Number(record.geoCheck.distanceMeters)
              : null,
          latitude:
            record.geoCheck?.latitude === 0 || record.geoCheck?.latitude
              ? Number(record.geoCheck.latitude)
              : null,
          longitude:
            record.geoCheck?.longitude === 0 || record.geoCheck?.longitude
              ? Number(record.geoCheck.longitude)
              : null,
          error: record.geoCheck?.error || ""
        });
      } else {
        setAttendanceQrInput("");
        setGeoCheck({
          checked: false,
          withinRadius: false,
          distanceMeters: null,
          latitude: null,
          longitude: null,
          error: ""
        });
      }
    } catch (err) {
      console.error(err);
      setTeacherAttendanceRecord(null);
      setAttendanceQrInput("");
      setGeoCheck({
        checked: false,
        withinRadius: false,
        distanceMeters: null,
        latitude: null,
        longitude: null,
        error: ""
      });
    }
  };

  const fetchHomework = async () => {
    if (!currentUid) return;
    try {
      const snap = await getDocs(
        query(collection(db, "homework"), orderBy("createdAt", "desc"))
      );
      const items = snap.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((item) => item.teacherId === currentUid);
      setHomeworkItems(items);
    } catch (err) {
      console.error(err);
      setHomeworkItems([]);
    }
  };

  const runGeoCheck = () => {
    if (!attendancePolicy?.enforceGeo) {
      setGeoCheck({
        checked: true,
        withinRadius: true,
        distanceMeters: 0,
        latitude: null,
        longitude: null,
        error: ""
      });
      return;
    }

    if (
      !attendancePolicy?.schoolLatitude ||
      !attendancePolicy?.schoolLongitude ||
      !navigator.geolocation
    ) {
      setGeoCheck({
        checked: true,
        withinRadius: false,
        distanceMeters: null,
        latitude: null,
        longitude: null,
        error: "School location policy is incomplete or geolocation is unavailable."
      });
      return;
    }

    setCheckingGeo(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const distanceMeters = calculateDistanceMeters(
          attendancePolicy.schoolLatitude,
          attendancePolicy.schoolLongitude,
          position.coords.latitude,
          position.coords.longitude
        );
        setGeoCheck({
          checked: true,
          withinRadius: distanceMeters <= Number(attendancePolicy.radiusMeters || 150),
          distanceMeters,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: ""
        });
        setCheckingGeo(false);
      },
      (error) => {
        setGeoCheck({
          checked: true,
          withinRadius: false,
          distanceMeters: null,
          latitude: null,
          longitude: null,
          error: error.message || "Could not verify current location."
        });
        setCheckingGeo(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  useEffect(() => {
    fetchStudentAttendance();
  }, [selectedClassKey, studentAttendanceDate]);

  useEffect(() => {
    fetchTeacherAttendance();
  }, [currentUid, teacherAttendanceDate]);

  useEffect(() => {
    fetchHomework();
  }, [currentUid]);

  useEffect(() => {
    if (!isScannerOpen) {
      stopQrScanner();
      return undefined;
    }

    let isMounted = true;

    const startQrScanner = async () => {
      setScannerError("");

      if (!attendancePolicy?.requireQr) {
        setIsScannerOpen(false);
        return;
      }

      if (!attendancePolicy?.officeQrCode) {
        setScannerError("School office QR is not configured yet. Contact admin.");
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setScannerError("Camera access is not supported in this browser.");
        return;
      }

      if (!window.BarcodeDetector) {
        setScannerError(
          "QR scan is not supported in this browser. Use latest Chrome or Edge with camera access."
        );
        return;
      }

      try {
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const scanFrame = async () => {
          if (!isMounted || !videoRef.current) return;

          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              const matchedValue = codes
                .map((code) => parseScannedQrValue(code.rawValue))
                .find(Boolean);

              if (matchedValue && matchedValue === attendancePolicy?.officeQrCode) {
                setAttendanceQrInput(matchedValue);
                setScannerError("");
                setIsScannerOpen(false);
                return;
              }

              setScannerError(
                "This QR does not match the school office attendance QR. Scan the office QR again."
              );
            }
          } catch (err) {
            setScannerError(err?.message || "Could not read QR from camera.");
          }

          scanFrameRef.current = requestAnimationFrame(scanFrame);
        };

        scanFrameRef.current = requestAnimationFrame(scanFrame);
      } catch (err) {
        setScannerError(err?.message || "Could not start QR scanner.");
      }
    };

    startQrScanner();

    return () => {
      isMounted = false;
      stopQrScanner();
    };
  }, [
    attendancePolicy?.officeQrCode,
    attendancePolicy?.requireQr,
    isScannerOpen,
    officeQrPayload
  ]);

  useEffect(() => {
    return () => {
      stopQrScanner();
    };
  }, []);

  const updateStudentStatus = (studentId, status) => {
    setStudentAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        status,
        studentName:
          selectedStudents.find((student) => student.id === studentId)?.name || "",
        updatedAt: new Date().toISOString()
      }
    }));
  };

  const saveStudentAttendance = async () => {
    if (!selectedClassKey || !studentAttendanceDate || !currentUid) return;
    setSavingStudentAttendance(true);
    try {
      const [className, sectionName] = selectedClassKey.split("__");
      const records = {};
      selectedStudents.forEach((student) => {
        records[student.id] = {
          status: studentAttendanceMap[student.id]?.status || "present",
          studentName: student.name || "",
          rollNo: student.rollNo || "",
          markedBy: currentUid
        };
      });

      await setDoc(
        doc(db, "studentAttendance", `${studentAttendanceDate}_${selectedClassKey}`),
        {
          className,
          sectionName,
          date: studentAttendanceDate,
          records,
          updatedAt: serverTimestamp(),
          markedBy: currentUid
        },
        { merge: true }
      );

      alert("Student attendance saved.");
    } catch (err) {
      console.error(err);
      alert("Could not save student attendance.");
    } finally {
      setSavingStudentAttendance(false);
    }
  };

  const saveTeacherAttendance = async () => {
    if (!currentUid || !teacherAttendanceDate) return;
    if (attendancePolicy?.requireQr && !attendancePolicy?.officeQrCode) {
      alert("School office QR/code is not configured yet. Contact admin.");
      return;
    }
    if (isQrRequired && !isQrVerified) {
      alert("Enter the correct office QR/code before submitting attendance.");
      return;
    }
    if (isGeoRequired && !geoCheck.checked) {
      alert("Run geolocation verification before submitting attendance.");
      return;
    }
    if (isGeoRequired && !isGeoVerified) {
      alert("You are outside the allowed school attendance radius.");
      return;
    }
    setSavingTeacherAttendance(true);
    try {
      await setDoc(
        doc(db, "teacherAttendance", `${currentUid}_${teacherAttendanceDate}`),
        {
          teacherId: currentUid,
          teacherName: teacherProfile?.teacherName || "Teacher",
          status: teacherAttendanceStatus,
          note: teacherAttendanceNote,
          date: teacherAttendanceDate,
          qrCode: attendanceQrInput,
          qrVerified: isQrVerified,
          expectedWifiName: attendancePolicy?.schoolWifiName || "",
          geoCheck: {
            checked: geoCheck.checked,
            withinRadius: geoCheck.withinRadius,
            distanceMeters: geoCheck.distanceMeters,
            latitude: geoCheck.latitude,
            longitude: geoCheck.longitude,
            error: geoCheck.error || ""
          },
          verificationStatus: "pending",
          verificationLabel: "Pending Admin Review",
          verifiedBy: "",
          verifiedAt: null,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      setTeacherAttendanceRecord({
        status: teacherAttendanceStatus,
        note: teacherAttendanceNote,
        date: teacherAttendanceDate,
        qrCode: attendanceQrInput,
        qrVerified: isQrVerified,
        expectedWifiName: attendancePolicy?.schoolWifiName || "",
        geoCheck: {
          checked: geoCheck.checked,
          withinRadius: geoCheck.withinRadius,
          distanceMeters: geoCheck.distanceMeters,
          latitude: geoCheck.latitude,
          longitude: geoCheck.longitude,
          error: geoCheck.error || ""
        },
        verificationStatus: "pending",
        verificationLabel: "Pending Admin Review"
      });
      alert("Attendance submitted for admin verification.");
    } catch (err) {
      console.error(err);
      alert("Could not save teacher attendance.");
    } finally {
      setSavingTeacherAttendance(false);
    }
  };

  const saveHomework = async () => {
    if (!currentUid || !homeworkClassKey || !homeworkForm.subject || !homeworkForm.title || !homeworkForm.description) {
      alert("Fill class, subject, title and homework details.");
      return;
    }

    setSavingHomework(true);
    try {
      const [className, sectionName] = homeworkClassKey.split("__");
      await addDoc(collection(db, "homework"), {
        teacherId: currentUid,
        teacherName: teacherProfile?.teacherName || "Teacher",
        className,
        sectionName,
        subject: homeworkForm.subject,
        title: homeworkForm.title,
        description: homeworkForm.description,
        dueDate: homeworkForm.dueDate,
        createdAt: serverTimestamp(),
        status: "active"
      });

      setHomeworkForm({
        subject: "",
        title: "",
        description: "",
        dueDate: toInputDate(new Date(Date.now() + 86400000))
      });
      await fetchHomework();
      alert("Homework published.");
    } catch (err) {
      console.error(err);
      alert("Could not publish homework.");
    } finally {
      setSavingHomework(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100">
        <TeacherNavbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-emerald-200" />
              <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin" />
            </div>
            <p className="text-lg font-semibold text-slate-800">
              Loading teacher dashboard
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100">
        <TeacherNavbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="card-soft p-6 text-center">
            <p className="text-rose-600 font-semibold">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <TeacherNavbar isClassTeacher={role === "class_teacher"} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-emerald-700">
            Teacher Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Mark attendance, publish homework, and manage your assigned classes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            icon={GraduationCap}
            label="Teacher"
            value={teacherProfile?.teacherName || "Teacher"}
            accent="bg-gradient-to-br from-emerald-500 to-teal-600"
          />
          <StatCard
            icon={UserSquare2}
            label="Assigned Students"
            value={students.length}
            accent="bg-gradient-to-br from-sky-500 to-blue-600"
          />
          <StatCard
            icon={ClipboardCheck}
            label="Class Groups"
            value={classOptions.length}
            accent="bg-gradient-to-br from-amber-500 to-orange-500"
          />
          <StatCard
            icon={BookOpenCheck}
            label="Homework Posts"
            value={homeworkItems.length}
            accent="bg-gradient-to-br from-violet-500 to-indigo-600"
          />
        </div>

        <div className="mt-6 grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-6">
          <div className="space-y-6">
            <div className="card-soft">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-sm">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">Teacher Attendance</p>
                  <p className="text-sm text-slate-500">
                    Mark your daily attendance and note.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Date
                  </label>
                  <input
                    type="date"
                    value={teacherAttendanceDate}
                    onChange={(e) => setTeacherAttendanceDate(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Status
                  </label>
                  <select
                    value={teacherAttendanceStatus}
                    onChange={(e) => setTeacherAttendanceStatus(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {teacherAttendanceStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Note
                </label>
                <textarea
                  value={teacherAttendanceNote}
                  onChange={(e) => setTeacherAttendanceNote(e.target.value)}
                  className="min-h-[96px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Optional note for today"
                />
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Attendance Security Checks
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Teacher must scan the fixed office QR and verify current school location before attendance submission.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span
                      className={`rounded-full px-2.5 py-1 font-semibold ${
                        isQrVerified
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      QR {isQrRequired ? (isQrVerified ? "scanned" : "required") : "optional"}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 font-semibold ${
                        isGeoVerified
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      Geo {isGeoRequired ? (isGeoVerified ? "verified" : "required") : "optional"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Office Attendance QR
                    </label>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                              isQrVerified
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-violet-100 text-violet-700"
                            }`}
                          >
                            {isQrVerified ? <CheckCircle2 size={20} /> : <ScanLine size={20} />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {isQrVerified
                                ? "Office QR scanned successfully"
                                : "Scan the office QR from school office"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {isQrVerified
                                ? `QR code verified: ${attendanceQrInput}`
                                : "Manual code entry is disabled. Camera scan is required."}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setScannerError("");
                            setIsScannerOpen(true);
                          }}
                          disabled={!attendancePolicy?.requireQr || !attendancePolicy?.officeQrCode}
                          className="inline-flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Camera size={18} />
                          {isQrVerified ? "Scan Again" : "Scan Office QR"}
                        </button>
                      </div>

                      {isScannerOpen && (
                        <div className="mt-4 rounded-2xl border border-dashed border-violet-200 bg-slate-950 p-3">
                          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-black">
                            <video
                              ref={videoRef}
                              autoPlay
                              muted
                              playsInline
                              className="aspect-video w-full object-cover"
                            />
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                              <div className="h-40 w-40 rounded-3xl border-2 border-emerald-300/80 shadow-[0_0_0_9999px_rgba(2,6,23,0.35)]" />
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs text-slate-300">
                              Point your camera at the office QR pasted in school office.
                            </p>
                            <button
                              type="button"
                              onClick={() => setIsScannerOpen(false)}
                              className="rounded-xl border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                            >
                              Close Scanner
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={runGeoCheck}
                    disabled={checkingGeo}
                    className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                  >
                    {checkingGeo ? "Checking..." : "Verify My Location"}
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  {attendancePolicy?.schoolWifiName && (
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                      Expected Wi-Fi: {attendancePolicy.schoolWifiName}
                    </span>
                  )}
                  {isQrVerified && (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">
                      QR scan complete
                    </span>
                  )}
                  {geoCheck.checked && geoCheck.distanceMeters !== null && (
                    <span
                      className={`rounded-full border px-2.5 py-1 ${
                        geoCheck.withinRadius
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-rose-200 bg-rose-50 text-rose-700"
                      }`}
                    >
                      Distance from school: {geoCheck.distanceMeters} m
                    </span>
                  )}
                  {attendancePolicy?.radiusMeters ? (
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                      Allowed radius: {attendancePolicy.radiusMeters} m
                    </span>
                  ) : null}
                </div>

                {geoCheck.error && (
                  <p className="mt-2 text-xs text-rose-600">{geoCheck.error}</p>
                )}
                {scannerError && (
                  <p className="mt-2 text-xs text-rose-600">{scannerError}</p>
                )}
                {!attendanceReadyForSubmit && (
                  <p className="mt-2 text-xs text-amber-700">
                    Scan the office QR and complete location verification before attendance submission.
                  </p>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-slate-500">
                  Last saved:{" "}
                  {teacherAttendanceRecord?.date ? (
                    <span className="font-semibold text-slate-700">
                      {teacherAttendanceRecord.date}
                    </span>
                  ) : (
                    "No record"
                  )}
                  {teacherAttendanceRecord?.verificationStatus && (
                    <span className="ml-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      {teacherAttendanceRecord.verificationStatus === "verified"
                        ? "Verified by Admin"
                        : teacherAttendanceRecord.verificationStatus === "rejected"
                          ? "Rejected by Admin"
                          : "Pending Admin Review"}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={saveTeacherAttendance}
                  disabled={savingTeacherAttendance || !attendanceReadyForSubmit}
                  className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {savingTeacherAttendance ? "Saving..." : "Save My Attendance"}
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Self-marked teacher attendance remains pending until admin verifies it.
              </p>
            </div>

            <div className="card-soft">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <BookOpenCheck size={20} />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">Homework Publisher</p>
                  <p className="text-sm text-slate-500">
                    Assign class-wise homework with subject and due date.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Class & Section
                  </label>
                  <select
                    value={homeworkClassKey}
                    onChange={(e) => setHomeworkClassKey(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {classOptions.map((option) => {
                      const [className, sectionName] = option.split("__");
                      return (
                        <option key={option} value={option}>
                          Class {className || "--"} {sectionName ? `(${sectionName})` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={homeworkForm.dueDate}
                    onChange={(e) =>
                      setHomeworkForm((prev) => ({ ...prev, dueDate: e.target.value }))
                    }
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Subject
                  </label>
                  <input
                    value={homeworkForm.subject}
                    onChange={(e) =>
                      setHomeworkForm((prev) => ({ ...prev, subject: e.target.value }))
                    }
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="English, Maths..."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Title
                  </label>
                  <input
                    value={homeworkForm.title}
                    onChange={(e) =>
                      setHomeworkForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="Chapter revision"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Homework Details
                </label>
                <textarea
                  value={homeworkForm.description}
                  onChange={(e) =>
                    setHomeworkForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="min-h-[110px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Write complete homework instructions..."
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-slate-500">
                  Subjects:{" "}
                  <span className="font-semibold text-slate-700">
                    {teacherProfile?.subjects?.length
                      ? teacherProfile.subjects.join(", ")
                      : "Not assigned yet"}
                  </span>
                </div>
                <div className="text-sm text-slate-500">
                  Primary Class Teacher:{" "}
                  <span className="font-semibold text-slate-700">
                    {teacherProfile?.primaryClassGroup
                      ? `Class ${teacherProfile.primaryClassGroup.split("__")[0] || "--"}${
                          teacherProfile.primaryClassGroup.split("__")[1]
                            ? ` (${teacherProfile.primaryClassGroup.split("__")[1]})`
                            : ""
                        }`
                      : "Not assigned"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={saveHomework}
                  disabled={savingHomework}
                  className="rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                >
                  {savingHomework ? "Publishing..." : "Publish Homework"}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card-soft">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-sm">
                  <ClipboardCheck size={20} />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">Student Attendance</p>
                  <p className="text-sm text-slate-500">
                    Mark class-wise attendance for your assigned students.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Class & Section
                  </label>
                  <select
                    value={selectedClassKey}
                    onChange={(e) => setSelectedClassKey(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {classOptions.map((option) => {
                      const [className, sectionName] = option.split("__");
                      return (
                        <option key={option} value={option}>
                          Class {className || "--"} {sectionName ? `(${sectionName})` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Date
                  </label>
                  <input
                    type="date"
                    value={studentAttendanceDate}
                    onChange={(e) => setStudentAttendanceDate(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="mt-4 max-h-[460px] overflow-auto space-y-3 pr-1">
                {selectedStudents.map((student) => {
                  const currentStatus = studentAttendanceMap[student.id]?.status || "present";
                  return (
                    <div
                      key={student.id}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{student.name}</p>
                          <p className="text-xs text-slate-500">
                            Roll {student.rollNo || "--"} | Father {student.fatherName || "--"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {attendanceStatuses.map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => updateStudentStatus(student.id, status)}
                              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                                currentStatus === status
                                  ? "bg-sky-600 text-white"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {selectedStudents.length === 0 && (
                  <p className="text-sm text-slate-500">No students found for this class group.</p>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-sm text-slate-500">
                  Total students:{" "}
                  <span className="font-semibold text-slate-700">
                    {selectedStudents.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={saveStudentAttendance}
                  disabled={savingStudentAttendance || selectedStudents.length === 0}
                  className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
                >
                  {savingStudentAttendance ? "Saving..." : "Save Student Attendance"}
                </button>
              </div>
            </div>

            <div className="card-soft">
              <p className="text-lg font-bold text-slate-900">Published Homework</p>
              <p className="mt-1 text-sm text-slate-500">
                Your recent homework posts by class and subject.
              </p>
              <div className="mt-4 max-h-[360px] overflow-auto space-y-3 pr-1">
                {homeworkItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{item.title}</p>
                        <p className="text-xs text-slate-500">
                          Class {item.className || "--"}
                          {item.sectionName ? ` (${item.sectionName})` : ""} |{" "}
                          {item.subject || "--"}
                        </p>
                      </div>
                      <StatusPill value={item.status} />
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      Due: {item.dueDate || "--"}
                    </p>
                  </div>
                ))}
                {homeworkItems.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No homework published yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
