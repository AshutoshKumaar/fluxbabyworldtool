export default function FeeHistory({ fees }) {
  return (
    <div className="card-soft">
      <p className="card-title">
        Fee History
      </p>
      <div className="mt-3 space-y-2">
        {fees.length === 0 && (
          <p className="text-sm text-slate-500">
            No monthly fees added yet.
          </p>
        )}
        {fees.map((fee) => (
          <div
            key={fee.id}
            className="flex items-center justify-between text-sm bg-slate-50 rounded-xl px-3 py-2"
          >
            <div>
              <p className="font-semibold text-slate-800">
                {fee.monthName || `${fee.month}/${fee.year}`}
              </p>
              <p className="text-xs text-slate-500">
                Total: Rs {fee.totalFees} | Paid: Rs {fee.paidFees}
              </p>
            </div>
            <span className="text-xs font-semibold text-rose-600">
              Due Rs {fee.dueFees}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
