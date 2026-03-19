import ReportCardPreview from "@/app/components/shared/report-card-preview";
import { RC_SCHOOL } from "../../../lib/report-card";

export default function MarksheetCard({ reportCard, onDownload }) {
  if (!reportCard) {
    return (
      <div className="card-soft">
        <p className="card-title">Marksheet / Report Card</p>
        <p className="mt-3 text-sm text-slate-500">
          Marksheet has not been prepared by school admin yet.
        </p>
      </div>
    );
  }

  return (
    <div className="card-soft">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="card-title">Marksheet / Report Card</p>
          <p className="mt-1 text-xs text-slate-500">
            {RC_SCHOOL.name} | Academic Year {reportCard.academicYear || "--"}
          </p>
        </div>
        <button
          type="button"
          onClick={onDownload}
          className="rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
        >
          Download Marksheet
        </button>
      </div>

      <ReportCardPreview reportCard={reportCard} />
    </div>
  );
}
