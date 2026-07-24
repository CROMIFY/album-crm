const SIZE = 18;
const STROKE = 2.5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function SubtaskProgressRing({ done, total }: { done: number; total: number }) {
  if (total === 0) return null;
  const ratio = done / total;
  const offset = CIRCUMFERENCE * (1 - ratio);

  return (
    <div className="flex items-center gap-1">
      <svg width={SIZE} height={SIZE} className="-rotate-90">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-muted"
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={ratio === 1 ? "stroke-[var(--chart-2)]" : "stroke-primary"}
        />
      </svg>
      <span className="text-muted-foreground text-xs tabular-nums">
        {done}/{total}
      </span>
    </div>
  );
}
