type ForeignFlowGaugeProps = {
  foreignBuy: number;
  foreignSell: number;
  netFlow: number;
  insightText: string;
  sessionDate: string | Date;
  isLoading?: boolean;
};

type ForeignFlowGaugeVisualProps = Pick<
  ForeignFlowGaugeProps,
  "foreignBuy" | "foreignSell" | "netFlow" | "isLoading"
> & {
  scale?: "default" | "large";
  readoutLabel?: string;
};

const compactCurrency = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  notation: "compact",
});

const plainNumber = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

function formatIqd(value: number) {
  return `${compactCurrency.format(Math.abs(value))} IQD`;
}

function formatSessionDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return new Intl.DateTimeFormat("ar-IQ", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function polarPoint(cx: number, cy: number, r: number, fraction: number) {
  const clamped = Math.max(0, Math.min(1, fraction));
  const angle = ((180 - clamped * 180) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angle),
    y: cy - r * Math.sin(angle),
  };
}

function arcPath(cx: number, cy: number, r: number, startFraction: number, endFraction: number) {
  const start = polarPoint(cx, cy, r, startFraction);
  const end = polarPoint(cx, cy, r, endFraction);
  return `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`;
}

function flowNeedlePoint(cx: number, cy: number, r: number, buyShare: number, isPositive: boolean) {
  if (isPositive) {
    return polarPoint(cx, cy, r, 1 - buyShare / 2);
  }
  return polarPoint(cx, cy, r, (1 - buyShare) / 2);
}

export function ForeignFlowGauge({
  foreignBuy,
  foreignSell,
  netFlow,
  insightText,
  sessionDate,
  isLoading = false,
}: ForeignFlowGaugeProps) {
  const isPositive = netFlow >= 0;
  const hasData = foreignBuy + foreignSell > 0 && !isLoading;

  return (
    <aside className="foreign-flow-card" aria-labelledby="foreign-title">
      <div className="flow-status-row">
        <span className={isPositive ? "flow-status-dot gain-dot" : "flow-status-dot loss-dot"} />
        <span>إشارة سيولة</span>
        <bdi>{formatSessionDate(sessionDate)}</bdi>
      </div>

      <h2 id="foreign-title">حركة المستثمرين الأجانب</h2>

      <ForeignFlowGaugeVisual
        foreignBuy={foreignBuy}
        foreignSell={foreignSell}
        netFlow={netFlow}
        isLoading={isLoading}
      />

      <p>{hasData ? insightText : "لا توجد بيانات لليوم"}</p>
    </aside>
  );
}

export function ForeignFlowGaugeVisual({
  foreignBuy,
  foreignSell,
  netFlow,
  isLoading = false,
  scale = "default",
  readoutLabel,
}: ForeignFlowGaugeVisualProps) {
  const total = foreignBuy + foreignSell;
  const hasData = total > 0 && !isLoading;
  const buyShare = hasData ? Math.max(0, Math.min(1, foreignBuy / total)) : 0.5;
  const sellShare = 1 - buyShare;
  const isPositive = netFlow >= 0;
  const needlePoint = flowNeedlePoint(120, 120, 86, buyShare, isPositive);
  const buyPercent = Math.round(buyShare * 100);
  const sellPercent = 100 - buyPercent;
  const ariaLabel = hasData
    ? `صافي ${isPositive ? "دخول" : "خروج"} ${formatIqd(netFlow)}، شراء ${buyPercent}% وبيع ${sellPercent}%`
    : "لا توجد بيانات لحركة المستثمرين الأجانب لليوم";

  return (
    <div className={`foreign-gauge-visual ${scale === "large" ? "large" : ""}`}>
      <div className={isLoading ? "gauge-wrap gauge-loading" : "gauge-wrap"}>
        <svg className="flow-gauge" viewBox="0 0 240 150" role="img" aria-label={ariaLabel}>
          <title>{ariaLabel}</title>
          <path className="gauge-track" pathLength="100" d="M 34 120 A 86 86 0 0 1 206 120" />
          {hasData ? (
            <>
              <path
                className="gauge-sell"
                d={arcPath(120, 120, 86, 0, sellShare)}
              />
              <path
                className="gauge-buy"
                d={arcPath(120, 120, 86, sellShare, 1)}
              />
              <line className="gauge-needle" x1="120" y1="120" x2={needlePoint.x} y2={needlePoint.y} />
              <circle className="gauge-pivot" cx="120" cy="120" r="5" />
            </>
          ) : null}
        </svg>
        <div className="gauge-labels" aria-hidden="true">
          <span>بيع</span>
          <span>شراء</span>
        </div>
      </div>

      <div className={hasData ? "gauge-readout" : "gauge-readout empty-gauge"}>
        {isLoading ? (
          <span className="gauge-skeleton" />
        ) : hasData ? (
          <>
            <strong className={isPositive ? "gain" : "loss"}>
              <bdi>{isPositive ? "+" : "-"}{formatIqd(netFlow)}</bdi>
              <span aria-hidden="true">{isPositive ? "↗" : "↖"}</span>
            </strong>
            <small>{readoutLabel ?? (isPositive ? "صافي دخول اليوم" : "صافي خروج اليوم")}</small>
          </>
        ) : (
          <>
            <strong>لا توجد بيانات لليوم</strong>
            <small>تظهر الحركة بعد تنفيذ أول صفقة أجنبية.</small>
          </>
        )}
      </div>

      <div className="flow-totals">
        <div>
          <span>شراء أجنبي</span>
          <bdi>{hasData ? formatIqd(foreignBuy) : plainNumber.format(0)}</bdi>
        </div>
        <div>
          <span>بيع أجنبي</span>
          <bdi>{hasData ? formatIqd(foreignSell) : plainNumber.format(0)}</bdi>
        </div>
      </div>
    </div>
  );
}

// Usage:
// <ForeignFlowGauge
//   foreignBuy={4_860_000_000}
//   foreignSell={3_420_000_000}
//   netFlow={1_440_000_000}
//   insightText="تدفق موجب مركز في المصارف والاتصالات، رابع جلسة إيجابية على التوالي."
//   sessionDate="2026-07-24"
// />
