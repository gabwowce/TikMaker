// Paprastos ikonos be išorinių failų (demonstracijai): kiekviena – SVG,
// piešiama `color` spalva, `size` px dydžio.
type GlyphProps = { size: number; color: string };

export function Asterisk({ size, color }: GlyphProps) {
  const rays = 10;
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100">
      {Array.from({ length: rays }, (_, i) => (
        <line
          key={i}
          x1={0}
          y1={0}
          x2={0}
          y2={-44 + (i % 2) * 6}
          stroke={color}
          strokeWidth={9}
          strokeLinecap="round"
          transform={`rotate(${(360 / rays) * i})`}
        />
      ))}
    </svg>
  );
}
export function Prompt({ size, color }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <path
        d="M18 28 L42 50 L18 72"
        fill="none"
        stroke={color}
        strokeWidth={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1={52}
        y1={74}
        x2={84}
        y2={74}
        stroke={color}
        strokeWidth={10}
        strokeLinecap="round"
      />
    </svg>
  );
}
export function Brush({ size, color }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <path d="M70 12 L88 30 L50 68 L32 50 Z" fill={color} />
      <path
        d="M30 54 L46 70 C40 86 24 90 12 88 C16 80 14 66 30 54 Z"
        fill={color}
        opacity={0.75}
      />
    </svg>
  );
}
export function Sparkle({ size, color }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <path
        d="M50 4 C54 36 64 46 96 50 C64 54 54 64 50 96 C46 64 36 54 4 50 C36 46 46 36 50 4 Z"
        fill={color}
      />
    </svg>
  );
}
