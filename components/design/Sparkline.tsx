function points(values: number[], width: number, height: number) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / (max - min || 1)) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function Sparkline({
  values,
  positive = true,
  compact = false,
  label = "رسم بياني مصغر",
}: {
  values: number[];
  positive?: boolean;
  compact?: boolean;
  label?: string;
}) {
  return (
    <svg className={compact ? "sparkline compact-sparkline" : "sparkline"} viewBox="0 0 90 34" role="img" aria-label={label}>
      <polyline points={points(values, 90, 32)} />
      <path className={positive ? "spark-fill up-fill" : "spark-fill down-fill"} d={`M0,34 L${points(values, 90, 32)} L90,34 Z`} />
    </svg>
  );
}
