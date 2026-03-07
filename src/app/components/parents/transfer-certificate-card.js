import { getTcRows, TC_SCHOOL } from "../../../lib/transfer-certificate";

export default function TransferCertificateCard({ tcData, onDownload }) {
  if (!tcData) {
    return (
      <div className="card-soft">
        <p className="card-title">Transfer Certificate</p>
        <p className="mt-3 text-sm text-slate-500">
          Transfer Certificate has not been prepared by school admin yet.
        </p>
      </div>
    );
  }

  return (
    <div className="card-soft">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="card-title">Transfer Certificate</p>
          <p className="mt-1 text-xs text-slate-500">
            {TC_SCHOOL.name} | {TC_SCHOOL.regNo}
          </p>
        </div>
        <button
          type="button"
          onClick={onDownload}
          className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
        >
          Download TC
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="border-b border-slate-200 pb-3 text-center">
          <p className="text-xs font-semibold text-slate-500">
            {TC_SCHOOL.regNo}
          </p>
          <p className="text-2xl font-extrabold text-amber-700">
            {TC_SCHOOL.name}
          </p>
          <p className="text-sm font-semibold text-slate-700">
            {TC_SCHOOL.address}
          </p>
          <p className="text-xs text-slate-500">
            Email - {TC_SCHOOL.email} | Phone - {TC_SCHOOL.phone}
          </p>
          <p className="mt-2 text-sm font-bold tracking-[0.25em] text-slate-800">
            TRANSFER CERTIFICATE
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>
            TC No. {tcData.tcNo || "--"} / Session {tcData.session || "--"}
          </span>
          <span>Admission No. {tcData.admissionNo || "--"}</span>
        </div>

        <div className="mt-3 max-h-[420px] overflow-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <tbody>
              {getTcRows(tcData).map(([label, value]) => (
                <tr key={label} className="border-b border-slate-100">
                  <td className="w-[46%] px-3 py-2 font-semibold text-slate-600 align-top">
                    {label}
                  </td>
                  <td className="px-3 py-2 text-slate-800">
                    {value || "--"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
