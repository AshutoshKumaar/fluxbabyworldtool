import {
  formatRcDate,
  getAttendancePercentage,
  getMarksSummary,
  RC_SCHOOL
} from "../../../lib/report-card";

export default function ReportCardPreview({
  reportCard,
  showDownloadButton = false,
  onDownload = null,
  downloadLabel = "Download Marksheet"
}) {
  if (!reportCard) {
    return (
      <div className="rounded-[26px] border border-slate-200 bg-white p-5 text-sm text-slate-500">
        Select a student to preview the report card.
      </div>
    );
  }

  const subjectRows = Array.isArray(reportCard.subjects) ? reportCard.subjects : [];
  const personalityRows = Array.isArray(reportCard.personality)
    ? reportCard.personality
    : [];
  const attendancePct = getAttendancePercentage(
    reportCard.workingDays,
    reportCard.daysPresent
  );
  const marksSummary = getMarksSummary(subjectRows);

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-4">
      {showDownloadButton && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-slate-900">Report Card Preview</p>
            <p className="mt-1 text-xs text-slate-500">
              View and download the saved marksheet.
            </p>
          </div>
          <button
            type="button"
            onClick={onDownload}
            className="rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
          >
            {downloadLabel}
          </button>
        </div>
      )}

      <div className="relative flex min-h-[1120px] flex-col overflow-hidden rounded-[24px] border border-rose-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.88))]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-4 grid grid-cols-4 content-between justify-items-center gap-x-8 gap-y-6">
            {Array.from({ length: 16 }).map((_, index) => (
              <img
                key={`wm-${index}`}
                src="/logo.png"
                alt=""
                aria-hidden="true"
                className="h-[94px] w-[94px] object-contain opacity-[0.14]"
                style={{ transform: `rotate(${index % 2 === 0 ? -18 : -12}deg)` }}
              />
            ))}
          </div>
          <img
            src="/logo.png"
            alt=""
            aria-hidden="true"
            className="absolute inset-[15%_15%_14%_15%] m-auto h-[70%] w-[70%] object-contain opacity-[0.18]"
          />
        </div>

        <div className="grid grid-cols-[60px_1fr_60px] items-center gap-3 border-b border-rose-100 bg-gradient-to-b from-rose-50 via-orange-50 to-white px-4 py-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white/85 p-1.5">
            <img
              src="/logo.png"
              alt="School Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="text-center">
            <p className="text-[11px] font-semibold text-slate-500">{RC_SCHOOL.regNo}</p>
            <p className="font-serif text-[30px] font-black leading-none text-rose-800">
              {RC_SCHOOL.name}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-700">
              {RC_SCHOOL.address}
            </p>
            <p className="text-[11px] text-slate-500">
              Email: {RC_SCHOOL.email} | Phone: {RC_SCHOOL.phone}
            </p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white/85">
            <img
              src={reportCard.photoUrl || "/logo.png"}
              alt={reportCard.pupilName || "Student"}
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        <div className="border-b border-rose-100 bg-gradient-to-r from-rose-50 via-orange-50 to-rose-50 px-4 py-3 text-center font-serif text-sm font-black tracking-[0.08em] text-rose-800">
          {(reportCard.title || "REPORT CARD").toUpperCase()} FOR THE ACADEMIC YEAR{" "}
          {reportCard.academicYear || "--"}
        </div>

        <div className="grid grid-cols-2 gap-3 border-b border-slate-200 px-4 py-4 md:grid-cols-4">
          <InfoField label="Student Name" value={reportCard.pupilName} />
          <InfoField
            label="Batch / Class"
            value={`${reportCard.batch || reportCard.className || "--"}${
              reportCard.sectionName ? ` (${reportCard.sectionName})` : ""
            }`}
          />
          <InfoField label="Admission No" value={reportCard.admissionNo} />
          <InfoField label="Roll No" value={reportCard.rollNo} />
          <InfoField label="Date of Birth" value={formatRcDate(reportCard.dateOfBirth)} />
          <InfoField label="Father's Name" value={reportCard.fatherName} />
          <InfoField label="Mother's Name" value={reportCard.motherName} />
          <InfoField label="Issue Date" value={formatRcDate(reportCard.issueDate)} />
        </div>

        <div className="grid gap-4 px-4 py-4 xl:grid-cols-[1.55fr_1fr]">
          <PreviewTable
            title="Scholastic Areas"
            headers={["Subjects", "Full Marks", "Obtained Marks"]}
            rows={subjectRows.map((row) => [
              row.subject,
              row.fullMarks || row.maxMarks || "100",
              row.obtainedMarks || row.finalTerm || row.secondTerm || row.firstTerm
            ])}
          />
          <PreviewTable
            title="Personality Profile"
            headers={["Area", "Grade"]}
            rows={personalityRows.map((row) => [
              row.label,
              row.finalTerm || row.secondTerm || row.firstTerm
            ])}
          />
        </div>

        <div className="grid gap-4 border-t border-slate-200 px-4 py-4 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50/35 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-rose-800">
              Attendance
            </div>
            <div className="grid grid-cols-2 gap-px bg-slate-200">
              <MiniStat label="Working Days" value={reportCard.workingDays || "--"} />
              <MiniStat label="Days Present" value={reportCard.daysPresent || "--"} />
              <MiniStat label="Attendance %" value={`${attendancePct}%`} />
              <MiniStat label="Total Full Marks" value={marksSummary.totalFullMarks || "--"} />
              <MiniStat label="Total Obtained" value={marksSummary.totalObtainedMarks || "--"} />
              <MiniStat label="Percentage" value={`${marksSummary.percentage}%`} />
              <MiniStat label="Grade" value={marksSummary.grade} />
              <MiniStat
                label="Promoted / Result"
                value={reportCard.promotedTo || reportCard.resultStatus || "--"}
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50/35 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-rose-800">
              Remarks
            </div>
            <div className="min-h-[132px] bg-white/18 px-4 py-4 text-sm font-medium text-slate-700">
              {reportCard.remarks || "--"}
            </div>
          </div>
        </div>

        <div className="mt-auto grid gap-4 border-t border-slate-200 px-4 py-5 md:grid-cols-3">
          <SignatureBox name="Gyanvi" label="Principal" />
          <SignatureBox name="Monika Singh" label="MD" />
          <div className="flex min-h-[88px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/18 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            School Seal
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/25 px-3 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-1.5 text-sm font-semibold text-slate-800">{value || "--"}</p>
    </div>
  );
}

function PreviewTable({ title, headers, rows }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/18">
      <div className="border-b border-slate-200 bg-slate-50/35 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-rose-800">
        {title}
      </div>
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-orange-50/35 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-rose-800">
              {headers.map((header) => (
                <th key={header} className="border-b border-slate-200 px-3 py-2">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${title}-${index}`} className="border-b border-slate-100 last:border-b-0">
                {row.map((cell, cellIndex) => (
                  <td key={`${title}-${index}-${cellIndex}`} className="bg-transparent px-3 py-2 text-slate-700">
                    {cell || "--"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-white/22 px-4 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-1.5 text-sm font-semibold text-slate-800">{value || "--"}</p>
    </div>
  );
}

function SignatureBox({ name, label }) {
  return (
    <div className="flex min-h-[88px] flex-col justify-end rounded-2xl border border-dashed border-slate-300 bg-white/18 px-3 py-3">
      <p className="text-center text-[34px] leading-none text-blue-700" style={{ fontFamily: "cursive" }}>
        {name}
      </p>
      <p className="mt-2 border-t border-slate-300 pt-2 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
    </div>
  );
}
