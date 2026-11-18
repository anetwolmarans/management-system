// Shared formatting helpers for money & dates across views.
export const fmtMoney = (n: number) =>
  `$${(Number.isFinite(n) ? n : 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const fmtDate = (d: string | Date | null | undefined) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export const fmtDateRange = (a: string | Date, b: string | Date) =>
  `${fmtDate(a)} → ${fmtDate(b)}`;
