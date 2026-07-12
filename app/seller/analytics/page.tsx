"use client";

export default function Analytics() {
  const bars = [
    ["Feb", 40], ["Mar", 62], ["Apr", 55], ["May", 78], ["Jun", 92], ["Jul", 110],
  ] as const;
  const max = 120;
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-navy">Sales Analytics</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["Digital revenue", "$1,842"], ["Downloads", "845"], ["Refund rate", "1.1%"], ["Design→Make", "18%"]].map(([k, v]) => (
          <div key={k} className="t-card p-4"><div className="text-xs text-muted uppercase">{k}</div><div className="text-2xl font-bold text-navy mt-1">{v}</div></div>
        ))}
      </div>
      <div className="t-card p-5">
        <h2 className="font-semibold text-navy mb-4">Monthly digital revenue</h2>
        <div className="flex items-end gap-3 h-48">
          {bars.map(([m, v]) => (
            <div key={m} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-teal rounded-t" style={{ height: `${(v / max) * 100}%` }} />
              <span className="text-xs text-muted">{m}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
