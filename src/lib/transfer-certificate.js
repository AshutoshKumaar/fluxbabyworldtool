export const TC_SCHOOL = {
  name: "FLUX BABY WORLD SCHOOL",
  regNo: "U- Org Reg No. BR-16-0009367",
  address: "RAJHATHA, KATIHAR, BIHAR - 854105",
  email: "munnasingh.king@gmail.com",
  phone: "9122946266"
};

export const formatTcDate = (value) => {
  if (!value) return "--";
  const str = String(value).trim();
  if (!str) return "--";
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) return str;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [yyyy, mm, dd] = str.split("-");
    return `${dd}-${mm}-${yyyy}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    return str.replace(/\//g, "-");
  }
  const date = new Date(str);
  if (Number.isNaN(date.getTime())) return str;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

export const toTcInputDate = (value) => {
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

export const getDefaultTransferCertificate = (student = {}) => ({
  tcNo: "",
  session: "2025-2026",
  admissionNo: "",
  pupilName: student.name || "",
  motherName: student.motherName || "",
  fatherName: student.fatherName || "",
  dateOfBirth: toTcInputDate(student.dob || ""),
  nationality: "Indian",
  religion: "",
  category: "",
  admissionDate: "",
  admissionClass: student.class || "",
  lastClassStudied: student.class || "",
  lastExamResult: "",
  failedInSameClass: "No",
  subjectsStudied: "",
  qualifiedForPromotion: "Yes",
  promotedToClass: "",
  duesPaidUpto: "",
  feeConcession: "NA",
  workingDays: "",
  presentDays: "",
  nccScout: "NA",
  conduct: "GOOD",
  applicationDate: "",
  issueDate: "",
  leavingReason: "Parent's Request",
  remarks: "Good relation with parents"
});

export const getTcRows = (tc = {}) => [
  ["1. Name of pupil", tc.pupilName],
  ["2. Mother's name", tc.motherName],
  ["3. Father's name", tc.fatherName],
  ["4. Date of birth", formatTcDate(tc.dateOfBirth)],
  ["5. Nationality", tc.nationality],
  ["6. Religion", tc.religion],
  ["7. Whether the candidate belongs to", tc.category],
  ["8. Date of admission in your school with class", `${formatTcDate(tc.admissionDate)}${tc.admissionClass ? ` | ${tc.admissionClass}` : ""}`],
  ["9. Class in which pupil last studied", tc.lastClassStudied],
  ["10. School last examination done with result", tc.lastExamResult],
  ["11. Whether failed, if so once/twice in the same class", tc.failedInSameClass],
  ["12. Subject studied", tc.subjectsStudied],
  ["13. Whether qualified for promotion to the higher class", `${tc.qualifiedForPromotion}${tc.promotedToClass ? ` | ${tc.promotedToClass}` : ""}`],
  ["14. Month upto which the pupil has paid school dues", tc.duesPaidUpto],
  ["15. Any fee concession availed of", tc.feeConcession],
  ["16. Total no. of working days in last semester", tc.workingDays],
  ["17. Total no. of working days pupil present", tc.presentDays],
  ["18. Whether NCC cadet/Boy scout", tc.nccScout],
  ["19. General conduct", tc.conduct],
  ["20. Date of application for certificate", formatTcDate(tc.applicationDate)],
  ["21. Date of issue of certificate", formatTcDate(tc.issueDate)],
  ["22. Reason for leaving the school", tc.leavingReason],
  ["23. Any other remarks", tc.remarks]
];

export const buildTransferCertificateHtml = (tc = {}) => {
  const rows = getTcRows(tc)
    .map(
      ([label, value]) => `
        <tr>
          <td class="label">${label}</td>
          <td class="value">${value || "--"}</td>
        </tr>
      `
    )
    .join("");

  return `
    <html>
      <head>
        <title>Transfer Certificate</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Mooli&family=Dancing+Script:wght@700&display=swap');
          @page { size: A4 portrait; margin: 8mm; }
          * { box-sizing: border-box; }
          body { margin: 0; background: #f8fafc; font-family: 'Mooli', Arial, sans-serif; color: #111827; }
          .sheet { width: 100%; max-width: 194mm; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
          .header { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-bottom: 2px solid #facc15; background: #fef08a; }
          .header img { width: 60px; height: 60px; object-fit: contain; }
          .school-meta { flex: 1; text-align: center; line-height: 1.2; }
          .reg { font-size: 11px; font-weight: 700; }
          .school { font-size: 28px; font-weight: 800; color: #7f1d1d; margin: 2px 0; }
          .meta { font-size: 12px; font-weight: 700; }
          .title { text-align: center; padding: 8px 12px; font-size: 16px; font-weight: 800; letter-spacing: .08em; border-bottom: 1px solid #e2e8f0; }
          .tc-meta { display: flex; justify-content: space-between; gap: 12px; padding: 10px 16px 0; font-size: 12px; font-weight: 700; }
          .content { padding: 10px 16px 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top; }
          .label { width: 44%; font-weight: 700; color: #334155; }
          .value { width: 56%; font-weight: 600; }
          .footer { display: flex; justify-content: space-between; gap: 12px; padding-top: 28px; margin-top: 10px; align-items: flex-end; }
          .sig-wrap { width: 170px; min-height: 72px; border: 1px dashed #cbd5f5; border-radius: 8px; padding: 10px 8px 8px; display: flex; flex-direction: column; justify-content: flex-end; }
          .sig-name { font-family: 'Dancing Script', cursive; font-size: 30px; line-height: 1; color: #1d4ed8; text-align: center; margin-top: 6px; }
          .sig-title { margin-top: 6px; padding-top: 4px; border-top: 1px solid #cbd5f5; font-size: 10px; text-align: center; color: #475569; font-weight: 700; letter-spacing: .04em; }
          .seal { width: 120px; height: 72px; border: 1px dashed #cbd5f5; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 10px; }
          @media print { body { background: #fff; } .sheet { border: none; border-radius: 0; max-width: 100%; } }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="header">
            <img src="/logo.png" alt="School Logo" />
            <div class="school-meta">
              <div class="reg">${TC_SCHOOL.regNo}</div>
              <div class="school">${TC_SCHOOL.name}</div>
              <div class="meta">${TC_SCHOOL.address}</div>
              <div class="meta">Email - ${TC_SCHOOL.email} | Phone - ${TC_SCHOOL.phone}</div>
            </div>
          </div>
          <div class="title">TRANSFER CERTIFICATE</div>
          <div class="tc-meta">
            <div>TC No. ${tc.tcNo || "--"} / Session ${tc.session || "--"}</div>
            <div>Admission No. ${tc.admissionNo || "--"}</div>
          </div>
          <div class="content">
            <table>
              <tbody>
                ${rows}
              </tbody>
            </table>
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
          </div>
        </div>
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `;
};
