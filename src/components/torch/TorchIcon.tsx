// テストの松明（05-visual-design.md 6-3）。ともった＝炎と光のにじみ、まだ＝灰
type Props = { lit: boolean; size: number; delayMs?: number };

export function TorchIcon({ lit, size, delayMs = 0 }: Props) {
  return (
    <span
      aria-hidden="true"
      className="relative inline-block shrink-0"
      style={{ width: size, height: size }}
    >
      {lit && (
        <span
          className="absolute -inset-3 animate-ignite"
          style={{
            animationDelay: `${delayMs}ms`,
            background: 'radial-gradient(circle, rgb(var(--torch) / 0.35), transparent 65%)',
          }}
        />
      )}
      <svg
        width={size}
        height={size}
        viewBox="0 0 8 8"
        shapeRendering="crispEdges"
        className={`relative block ${lit ? 'animate-ignite' : ''}`}
        style={lit ? { animationDelay: `${delayMs}ms` } : undefined}
      >
        <use href={lit ? '#tile-torch' : '#tile-torch-unlit'} width={8} height={8} />
      </svg>
    </span>
  );
}
