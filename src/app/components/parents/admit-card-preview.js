export default function AdmitCardPreview({
  student,
  exam,
  scheduleRows,
  canDownload,
  blockReason,
  onDownload,
  formatDate
}) {
  const classWithSection = `Class ${student?.class || "--"}${
    student?.section ? ` (${student.section})` : ""
  }`;

  if (!student) {
    return (
      <div className="card-soft">
        <p className="text-slate-500">No student data available.</p>
      </div>
    );
  }

  return (
    <div className="card-soft">
      <p className="card-title">
        Admit Card Preview
      </p>
      <div className="mt-4 space-y-4">
        <div className="flex items-center gap-4">
          {student.photoUrl ? (
            <img
              src={student.photoUrl}
              alt={student.name}
              className="h-16 w-16 rounded-2xl object-cover border"
            />
          ) : (
            <div className="h-16 w-16 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center font-semibold">
              {student.name?.split(" ").map((part) => part[0]).join("") || "S"}
            </div>
          )}
          <div>
            <p className="text-lg font-semibold text-slate-900">
              {student.name}
            </p>
            <p className="text-sm text-slate-500">
              {classWithSection} | Roll {student.rollNo}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500">Exam</p>
            <p className="font-semibold text-slate-800">
              {exam?.examName || "--"}
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500">Session</p>
            <p className="font-semibold text-slate-800">
              {exam?.session || "--"}
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500">Date</p>
            <p className="font-semibold text-slate-800">
              {formatDate(exam?.examDate || "")}
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500">Time</p>
            <p className="font-semibold text-slate-800">
              {exam?.examTime || "--"}
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500">Reporting</p>
            <p className="font-semibold text-slate-800">
              {exam?.reportingTime || "--"}
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 col-span-2">
            <p className="text-xs text-slate-500">Exam Center</p>
            <p className="font-semibold text-slate-800">
              {exam?.examCenter || "--"}
            </p>
          </div>
        </div>

        {canDownload ? (
          <div className="card-soft">
            <div className="flex items-center justify-between mb-3">
              <p className="card-title">
                Class Time Table
              </p>
              <button
                type="button"
                onClick={onDownload}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Download Admit Card
              </button>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="border-b border-slate-200 pb-2">Day</th>
                    <th className="border-b border-slate-200 pb-2">Date</th>
                    <th className="border-b border-slate-200 pb-2">Subject</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleRows.map((row, index) => (
                    <tr key={`${row.day}-${row.date}-${index}`}>
                      <td className="py-2 border-b border-slate-100">
                        {row.day}
                      </td>
                      <td className="py-2 border-b border-slate-100">
                        {row.date}
                      </td>
                      <td className="py-2 border-b border-slate-100">
                        {row.subject}
                      </td>
                    </tr>
                  ))}
                  {scheduleRows.length === 0 && (
                    <tr>
                      <td
                        colSpan="3"
                        className="py-3 text-slate-500 text-sm"
                      >
                        No timetable for this class.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            {blockReason || "Admit card download is not available."}
          </div>
        )}
      </div>
    </div>
  );
}
