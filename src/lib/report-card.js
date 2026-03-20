export const RC_SCHOOL = {
  name: "FLUX BABY WORLD SCHOOL",
  regNo: "Udyam Org. Reg No. BR-16-0009367",
  address: "Rajhatha, Katihar, Bihar - 854105",
  email: "munnasingh.king@gmail.com",
  phone: "9122946266"
};

export const RC_DEFAULT_SUBJECTS = [
  "English Language",
  "Hindi",
  "Mathematics",
  "General Science",
  "General Knowledge",
  "Handwriting",
  "Computer",
  "Art",
  "Physical Education"
];

export const RC_DEFAULT_PERSONALITY = [
  "Attitude Towards School & Authority",
  "Ethics and Self Discipline",
  "Regularity and Punctuality",
  "Conduct in Class",
  "Neatness and Cleanliness",
  "Application in Studies & Co-Curricular Activities",
  "Health",
  "Homework & Projects"
];

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getCurrentAcademicYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};

export const formatRcDate = (value) => {
  if (!value) return "--";
  const str = String(value).trim();
  if (!str) return "--";
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) return str;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [yyyy, mm, dd] = str.split("-");
    return `${dd}-${mm}-${yyyy}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str.replace(/\//g, "-");
  const date = new Date(str);
  if (Number.isNaN(date.getTime())) return str;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

export const toRcInputDate = (value) => {
  if (!value) return "";
  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    const [dd, mm, yyyy] = str.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [dd, mm, yyyy] = str.split("/");
    return `${yyyy}-${mm}-${dd}`;
  }
  return "";
};

export const getEmptySubjectRow = () => ({
  subject: "",
  finalTerm: ""
});

export const getEmptyProfileRow = () => ({
  label: "",
  finalTerm: ""
});

const defaultSubjectRows = () =>
  RC_DEFAULT_SUBJECTS.map((subject) => ({
    subject,
    finalTerm: ""
  }));

const defaultProfileRows = () =>
  RC_DEFAULT_PERSONALITY.map((label) => ({
    label,
    finalTerm: ""
  }));

export const getDefaultReportCard = (student = {}) => ({
  academicYear: getCurrentAcademicYear(),
  title: "REPORT CARD",
  batch: student.class || "",
  admissionNo: student.admissionNo || "",
  rollNo: student.rollNo || "",
  dateOfBirth: toRcInputDate(student.dob || ""),
  pupilName: student.name || "",
  fatherName: student.fatherName || "",
  motherName: student.motherName || "",
  className: student.class || "",
  sectionName: student.section || "",
  photoUrl: student.photoUrl || "",
  finalTermLabel: "FINAL TERM",
  subjects: defaultSubjectRows(),
  personality: defaultProfileRows(),
  workingDays: "",
  daysPresent: "",
  remarks: "",
  promotedTo: "",
  resultStatus: "",
  issueDate: toRcInputDate(new Date()),
  attendanceNote: "",
  gradingNote: "Grades may be entered as A1, A2, B1, B2, C1 or marks format."
});

export const mergeReportCardData = (student = {}, saved = {}) => {
  const defaults = getDefaultReportCard(student);
  return {
    ...defaults,
    ...saved,
    pupilName: saved.pupilName || student.name || defaults.pupilName,
    fatherName: saved.fatherName || student.fatherName || defaults.fatherName,
    motherName: saved.motherName || student.motherName || defaults.motherName,
    rollNo: saved.rollNo || student.rollNo || defaults.rollNo,
    dateOfBirth:
      toRcInputDate(saved.dateOfBirth || student.dob || defaults.dateOfBirth) || "",
    className: saved.className || student.class || defaults.className,
    sectionName: saved.sectionName || student.section || defaults.sectionName,
    photoUrl: saved.photoUrl || student.photoUrl || defaults.photoUrl,
    subjects:
      Array.isArray(saved.subjects) && saved.subjects.length
        ? saved.subjects.map((row) => ({
            subject: row.subject || "",
            finalTerm:
              row.finalTerm || row.secondTerm || row.firstTerm || ""
          }))
        : defaults.subjects,
    personality:
      Array.isArray(saved.personality) && saved.personality.length
        ? saved.personality.map((row) => ({
            label: row.label || "",
            finalTerm:
              row.finalTerm || row.secondTerm || row.firstTerm || ""
          }))
        : defaults.personality
  };
};

export const getAttendancePercentage = (workingDays, daysPresent) => {
  const total = Number(workingDays || 0);
  const present = Number(daysPresent || 0);
  if (!total || Number.isNaN(total) || Number.isNaN(present)) return 0;
  return Math.max(0, Math.min(100, Math.round((present / total) * 100)));
};

export const buildReportCardHtml = (report = {}) => {
  const subjectsRows = (report.subjects || [])
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.subject || "--")}</td>
          <td>${escapeHtml(row.finalTerm || row.secondTerm || row.firstTerm || "--")}</td>
        </tr>
      `
    )
    .join("");

  const personalityRows = (report.personality || [])
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.label || "--")}</td>
          <td>${escapeHtml(row.finalTerm || row.secondTerm || row.firstTerm || "--")}</td>
        </tr>
      `
    )
    .join("");

  const attendancePct = getAttendancePercentage(report.workingDays, report.daysPresent);
  const batchOrClass = report.batch || report.className || "--";
  const classLine = `${escapeHtml(batchOrClass)}${
    report.sectionName ? ` (${escapeHtml(report.sectionName)})` : ""
  }`;
  const titleLine = `${escapeHtml(report.title || "REPORT CARD")} FOR THE ACADEMIC YEAR ${escapeHtml(
    report.academicYear || "--"
  )}`;

  return `
    <html>
      <head>
        <title>Report Card</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&family=Poppins:wght@400;500;600;700&family=Dancing+Script:wght@700&display=swap');
          @page { size: A4 portrait; margin: 8mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #f8fafc;
            font-family: 'Poppins', Arial, sans-serif;
            color: #111827;
          }
          .sheet {
            position: relative;
            width: 100%;
            max-width: 194mm;
            margin: 0 auto;
            min-height: 281mm;
            background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(249,250,251,0.88));
            border: 1px solid #d8dee9;
            border-radius: 14px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }
          .watermark-layer {
            position: absolute;
            inset: 0;
            pointer-events: none;
            overflow: hidden;
          }
          .watermark-grid {
            position: absolute;
            inset: 14px;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 26px 34px;
            align-content: space-between;
            justify-items: center;
          }
          .watermark-mark {
            width: 94px;
            height: 94px;
            transform: rotate(-18deg);
            opacity: 0.14;
            object-fit: contain;
            filter: grayscale(0.06);
          }
          .watermark-logo {
            position: absolute;
            inset: 15% 15% 14% 15%;
            width: 70%;
            height: 70%;
            margin: auto;
            object-fit: contain;
            opacity: 0.18;
          }
          .content {
            position: relative;
            z-index: 1;
            padding: 12px 14px 14px;
            flex: 1;
            display: flex;
            flex-direction: column;
          }
          .header {
            display: grid;
            grid-template-columns: 72px 1fr 72px;
            align-items: center;
            gap: 10px;
            background: linear-gradient(180deg, #fff7ed, #ffffff);
            border: 1px solid #fed7aa;
            border-radius: 14px;
            padding: 10px 12px;
          }
          .logo-wrap, .photo-wrap {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 64px;
            height: 64px;
            border-radius: 12px;
            border: 1px solid #dbe3ef;
            background: #fff;
            overflow: hidden;
          }
          .logo, .photo {
            width: 64px;
            height: 64px;
            object-fit: contain;
            background: #fff;
          }
          .photo { object-fit: cover; }
          .school {
            text-align: center;
            line-height: 1.15;
          }
          .school .reg {
            font-size: 11px;
            font-weight: 700;
            color: #475569;
          }
          .school .name {
            font-family: 'Merriweather', serif;
            font-size: 24px;
            font-weight: 900;
            color: #7f1d1d;
            margin: 2px 0 4px;
          }
          .school .meta {
            font-size: 11px;
            font-weight: 600;
            color: #334155;
          }
          .title-bar {
            margin-top: 10px;
            border: 1px solid #fecaca;
            background: linear-gradient(180deg, #fff1f2, #fff7ed);
            border-radius: 12px;
            text-align: center;
            padding: 8px 10px;
            font-family: 'Merriweather', serif;
            font-size: 16px;
            font-weight: 900;
            color: #7f1d1d;
            letter-spacing: 0.03em;
          }
          .student-grid {
            margin-top: 10px;
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 8px;
          }
          .field {
            border: 1px solid #e2e8f0;
            background: rgba(255,255,255,0.22);
            border-radius: 10px;
            padding: 7px 8px;
            min-height: 54px;
          }
          .field .label {
            font-size: 9px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          .field .value {
            margin-top: 4px;
            font-size: 12px;
            font-weight: 700;
            color: #0f172a;
          }
          .main {
            margin-top: 10px;
            display: grid;
            grid-template-columns: 1.55fr 1fr;
            gap: 10px;
          }
          .panel {
            border: 1px solid #dbe3ef;
            background: rgba(255,255,255,0.16);
            border-radius: 12px;
            overflow: hidden;
          }
          .panel-title {
            padding: 7px 10px;
            background: linear-gradient(180deg, rgba(239,246,255,0.34), rgba(248,250,252,0.24));
            border-bottom: 1px solid #dbe3ef;
            font-size: 11px;
            font-weight: 900;
            color: #7f1d1d;
            text-transform: uppercase;
            letter-spacing: 0.12em;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10.2px;
          }
          th, td {
            border: 1px solid #dbe3ef;
            padding: 5px 6px;
            vertical-align: top;
            line-height: 1.18;
          }
          th {
            background: rgba(255,247,237,0.32);
            font-weight: 800;
            color: #7f1d1d;
            text-transform: uppercase;
            font-size: 9.2px;
            letter-spacing: 0.06em;
          }
          .attendance-block {
            margin-top: 10px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          .remarks {
            min-height: 86px;
          }
          .remark-box {
            padding: 10px;
            font-size: 11px;
            font-weight: 600;
            color: #0f172a;
            background: rgba(255,255,255,0.18);
          }
          .footer {
            margin-top: auto;
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 12px;
            align-items: end;
          }
          .sig-wrap {
            min-height: 72px;
            border: 1px dashed #cbd5f5;
            border-radius: 10px;
            padding: 10px 8px 8px;
            background: rgba(255,255,255,0.18);
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
          }
          .sig-name {
            font-family: 'Dancing Script', cursive;
            font-size: 28px;
            line-height: 1;
            color: #1d4ed8;
            text-align: center;
          }
          .sig-title {
            margin-top: 5px;
            padding-top: 4px;
            border-top: 1px solid #cbd5f5;
            text-align: center;
            font-size: 10px;
            font-weight: 700;
            color: #475569;
            letter-spacing: 0.04em;
          }
          .seal {
            min-height: 72px;
            border: 1px dashed #cbd5f5;
            border-radius: 10px;
            background: rgba(255,255,255,0.18);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #94a3b8;
            font-size: 10px;
            font-weight: 700;
          }
          .small-note {
            margin-top: 6px;
            font-size: 9.5px;
            color: #64748b;
            text-align: right;
          }
          @media print {
            body { background: #fff; }
            .sheet { border: none; border-radius: 0; max-width: 100%; }
            .header,
            .title-bar,
            .field,
            .panel,
            .panel-title,
            .remark-box,
            .sig-wrap,
            .seal,
            th,
            td {
              box-shadow: none !important;
              filter: none !important;
              backdrop-filter: none !important;
            }
            .field,
            .panel,
            .remark-box,
            .sig-wrap,
            .seal,
            th,
            td {
              background: transparent !important;
            }
            .panel-title {
              background: rgba(255,255,255,0.08) !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="watermark-layer">
            <div class="watermark-grid">
              ${Array.from({ length: 16 })
                .map(
                  (_, index) =>
                    `<img class="watermark-mark" src="/logo.png" alt="" aria-hidden="true" style="transform: rotate(${index % 2 === 0 ? -18 : -12}deg);" />`
                )
                .join("")}
            </div>
            <img class="watermark-logo" src="/logo.png" alt="" aria-hidden="true" />
          </div>
          <div class="content">
            <div class="header">
              <div class="logo-wrap">
                <img class="logo" src="/logo.png" alt="School Logo" />
              </div>
              <div class="school">
                <div class="reg">${escapeHtml(RC_SCHOOL.regNo)}</div>
                <div class="name">${escapeHtml(RC_SCHOOL.name)}</div>
                <div class="meta">${escapeHtml(RC_SCHOOL.address)}</div>
                <div class="meta">Email: ${escapeHtml(RC_SCHOOL.email)} | Phone: ${escapeHtml(
    RC_SCHOOL.phone
  )}</div>
              </div>
              <div class="photo-wrap">
                <img class="photo" src="${escapeHtml(report.photoUrl || "/logo.png")}" alt="Student Photo" />
              </div>
            </div>

            <div class="title-bar">${titleLine}</div>

            <div class="student-grid">
              <div class="field"><div class="label">Student Name</div><div class="value">${escapeHtml(
                report.pupilName || "--"
              )}</div></div>
              <div class="field"><div class="label">Batch / Class</div><div class="value">${classLine}</div></div>
              <div class="field"><div class="label">Admission No</div><div class="value">${escapeHtml(
                report.admissionNo || "--"
              )}</div></div>
              <div class="field"><div class="label">Roll No</div><div class="value">${escapeHtml(
                report.rollNo || "--"
              )}</div></div>
              <div class="field"><div class="label">Date of Birth</div><div class="value">${escapeHtml(
                formatRcDate(report.dateOfBirth)
              )}</div></div>
              <div class="field"><div class="label">Father's Name</div><div class="value">${escapeHtml(
                report.fatherName || "--"
              )}</div></div>
              <div class="field"><div class="label">Mother's Name</div><div class="value">${escapeHtml(
                report.motherName || "--"
              )}</div></div>
              <div class="field"><div class="label">Issue Date</div><div class="value">${escapeHtml(
                formatRcDate(report.issueDate)
              )}</div></div>
            </div>

            <div class="main">
              <div class="panel">
                <div class="panel-title">Scholastic Areas</div>
                <table>
                  <thead>
                    <tr>
                      <th>Subjects</th>
                      <th>${escapeHtml(report.finalTermLabel || "FINAL TERM")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${subjectsRows}
                  </tbody>
                </table>
              </div>

              <div class="panel">
                <div class="panel-title">Personality Profile</div>
                <table>
                  <thead>
                    <tr>
                      <th>Area</th>
                      <th>${escapeHtml(report.finalTermLabel || "FINAL TERM")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${personalityRows}
                  </tbody>
                </table>
              </div>
            </div>

            <div class="attendance-block">
              <div class="panel">
                <div class="panel-title">Attendance</div>
                <table>
                  <tbody>
                    <tr>
                      <td><strong>No. of Working Days</strong></td>
                      <td>${escapeHtml(report.workingDays || "--")}</td>
                    </tr>
                    <tr>
                      <td><strong>No. of Days Present</strong></td>
                      <td>${escapeHtml(report.daysPresent || "--")}</td>
                    </tr>
                    <tr>
                      <td><strong>Attendance %</strong></td>
                      <td>${attendancePct}%</td>
                    </tr>
                    <tr>
                      <td><strong>Promoted</strong></td>
                      <td>${escapeHtml(report.promotedTo || report.resultStatus || "--")}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="panel remarks">
                <div class="panel-title">Remarks</div>
                <div class="remark-box">${escapeHtml(report.remarks || "--")}</div>
              </div>
            </div>

            <div class="footer">
              <div class="sig-wrap">
                <div class="sig-name">Gyanvi</div>
                <div class="sig-title">Principal</div>
              </div>
              <div class="sig-wrap">
                <div class="sig-name">Monika Singh</div>
                <div class="sig-title">MD</div>
              </div>
              <div class="seal">School Seal</div>
            </div>
            <div class="small-note">Generated by Flux Baby World School ERP</div>
          </div>
        </div>
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `;
};
