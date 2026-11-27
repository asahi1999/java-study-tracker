// ロゴの松明（05-visual-design.md 7-10。16×16 ドットの代わりに 8×8 の松明を拡大）
export function PixelTorchLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 8 8"
      shapeRendering="crispEdges"
    >
      <use href="#tile-torch" width={8} height={8} />
    </svg>
  );
}
