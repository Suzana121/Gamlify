import Svg, { Circle, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';

export const MAX_STAGE = 5;

/** Own artwork: 1 egg, 2 hatchling, 3 apprentice, 4 warrior, 5 crowned hero. */
export function Avatar({ stage, size = 140 }: { stage: number; size?: number }) {
  const s = Math.min(MAX_STAGE, Math.max(1, Math.round(stage) || 1));
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      accessibilityRole="image"
      accessibilityLabel={`Character avatar, stage ${s}`}
      testID={`avatar-stage-${s}`}
    >
      <Circle cx="50" cy="50" r="48" fill="#eef2ff" />
      {s === 1 && (
        <G>
          <Ellipse
            cx="50"
            cy="56"
            rx="22"
            ry="29"
            fill="#fde68a"
            stroke="#b45309"
            strokeWidth="2"
          />
          <Circle cx="42" cy="48" r="3" fill="#b45309" />
          <Circle cx="58" cy="62" r="4" fill="#b45309" />
          <Circle cx="52" cy="72" r="2.5" fill="#b45309" />
        </G>
      )}
      {s === 2 && (
        <G>
          <Path
            d="M28 62 L28 86 L72 86 L72 62 L62 70 L50 58 L38 70 Z"
            fill="#fde68a"
            stroke="#b45309"
            strokeWidth="2"
          />
          <Circle cx="50" cy="48" r="17" fill="#86efac" stroke="#15803d" strokeWidth="2" />
          <Circle cx="44" cy="46" r="3" fill="#14532d" />
          <Circle cx="56" cy="46" r="3" fill="#14532d" />
          <Path d="M44 54 Q50 59 56 54" stroke="#14532d" strokeWidth="2" fill="none" />
        </G>
      )}
      {s === 3 && (
        <G>
          <Rect
            x="32"
            y="56"
            width="36"
            height="32"
            rx="8"
            fill="#60a5fa"
            stroke="#1d4ed8"
            strokeWidth="2"
          />
          <Circle cx="50" cy="40" r="16" fill="#fcd9b6" stroke="#b45309" strokeWidth="2" />
          <Circle cx="44" cy="39" r="2.5" fill="#1f2937" />
          <Circle cx="56" cy="39" r="2.5" fill="#1f2937" />
          <Path d="M44 47 Q50 52 56 47" stroke="#1f2937" strokeWidth="2" fill="none" />
          <Polygon points="50,6 66,28 34,28" fill="#7c3aed" stroke="#4c1d95" strokeWidth="2" />
        </G>
      )}
      {s === 4 && (
        <G>
          <Path
            d="M30 54 L50 48 L70 54 L66 90 L34 90 Z"
            fill="#94a3b8"
            stroke="#334155"
            strokeWidth="2"
          />
          <Circle cx="50" cy="34" r="16" fill="#fcd9b6" stroke="#334155" strokeWidth="2" />
          <Path
            d="M32 34 A18 18 0 0 1 68 34 L68 28 A18 18 0 0 0 32 28 Z"
            fill="#475569"
            stroke="#334155"
            strokeWidth="2"
          />
          <Circle cx="44" cy="36" r="2.5" fill="#1f2937" />
          <Circle cx="56" cy="36" r="2.5" fill="#1f2937" />
          <Rect
            x="78"
            y="40"
            width="5"
            height="40"
            fill="#e2e8f0"
            stroke="#334155"
            strokeWidth="1.5"
          />
          <Rect x="73" y="66" width="15" height="4" fill="#b45309" />
          <Path
            d="M12 56 L30 56 L30 74 Q21 84 12 74 Z"
            fill="#ef4444"
            stroke="#7f1d1d"
            strokeWidth="2"
          />
        </G>
      )}
      {s === 5 && (
        <G>
          <Path
            d="M24 50 L10 92 L50 80 L90 92 L76 50 Z"
            fill="#dc2626"
            stroke="#7f1d1d"
            strokeWidth="2"
          />
          <Path
            d="M30 54 L50 48 L70 54 L66 90 L34 90 Z"
            fill="#fbbf24"
            stroke="#92400e"
            strokeWidth="2"
          />
          <Circle cx="50" cy="34" r="16" fill="#fcd9b6" stroke="#92400e" strokeWidth="2" />
          <Circle cx="44" cy="36" r="2.5" fill="#1f2937" />
          <Circle cx="56" cy="36" r="2.5" fill="#1f2937" />
          <Path d="M44 43 Q50 48 56 43" stroke="#1f2937" strokeWidth="2" fill="none" />
          <Polygon
            points="32,22 36,6 43,16 50,3 57,16 64,6 68,22"
            fill="#fde047"
            stroke="#92400e"
            strokeWidth="2"
          />
          <Polygon
            points="50,60 54,70 64,70 56,76 59,86 50,80 41,86 44,76 36,70 46,70"
            fill="#fef3c7"
            stroke="#92400e"
            strokeWidth="1.5"
          />
        </G>
      )}
    </Svg>
  );
}
