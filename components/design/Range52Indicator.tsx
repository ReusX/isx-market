export function range52Position(price: number, low: number, high: number) {
  return Math.max(0, Math.min(1, (price - low) / (high - low || 1)));
}

export function Range52Indicator({
  price,
  low,
  high,
  showValues = false,
}: {
  price: number;
  low: number;
  high: number;
  showValues?: boolean;
}) {
  const position = range52Position(price, low, high);
  return (
    <div className={`range-52-indicator ${showValues ? "with-values" : ""}`}>
      {showValues ? (
        <div className="range-52-values">
          <span>الأدنى <bdi>{low.toFixed(2)}</bdi></span>
          <span>الأعلى <bdi>{high.toFixed(2)}</bdi></span>
        </div>
      ) : null}
      <span className="range-52" title={`${low.toFixed(2)} – ${high.toFixed(2)} IQD`}>
        <span style={{ inlineSize: `${position * 100}%` }} />
      </span>
    </div>
  );
}
