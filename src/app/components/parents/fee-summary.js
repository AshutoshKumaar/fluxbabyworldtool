export default function FeeSummary({
  totalDue,
  isPaid,
  canDownload,
  blockReason,
  onDownload,
  onPayNow,
  onShowQr
}) {
  return (
    <div className="card-soft">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">Total Due</p>
          <p className="text-xl font-semibold text-slate-800">Rs {totalDue}</p>
        </div>
        <span
          className={`text-xs font-semibold px-3 py-1 rounded-full ${
            isPaid
              ? "bg-emerald-100 text-emerald-700"
              : "bg-rose-100 text-rose-700"
          }`}
        >
          {isPaid ? "Paid" : "Unpaid"}
        </span>
      </div>

      {!canDownload && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          {blockReason || "Admit card download is not available."}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3">
        <button
          type="button"
          onClick={onDownload}
          disabled={!canDownload}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
        >
          Download Admit Card
        </button>
        <button
          type="button"
          onClick={onPayNow}
          className="w-full border border-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50"
        >
          Pay Now (UPI)
        </button>
        <button
          type="button"
          onClick={onShowQr}
          className="w-full border border-indigo-200 text-indigo-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-50"
        >
          Pay via QR
        </button>
      </div>
    </div>
  );
}
