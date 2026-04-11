import React from "react";
import Svg, { Circle, Ellipse, Path, Rect, Polygon, G, Line, Defs, RadialGradient, Stop } from "react-native-svg";

interface IconProps {
  size: number;
  color?: string;
}

// HSK1: 草原 — plant
export function PlantIcon({ size, color = "#5B8C85" }: IconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 32 32">
      <Path d="M16 28 L16 14" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <Ellipse cx="10" cy="16" rx="6" ry="4" fill={color} opacity="0.9" transform="rotate(-20 10 16)" />
      <Ellipse cx="22" cy="13" rx="6" ry="4" fill={color} opacity="0.85" transform="rotate(20 22 13)" />
      <Ellipse cx="14" cy="10" rx="4.5" ry="3" fill={color} transform="rotate(-10 14 10)" />
      <Path d="M15 28 Q14 26 13 25" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
    </Svg>
  );
}

export function FlowerIcon({ size, color = "#E8956F" }: IconProps) {
  const s = size;
  const centerColor = "#F7D080";
  const angles = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <Svg width={s} height={s} viewBox="0 0 32 32">
      <G>
        {angles.map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const cx = 16 + Math.cos(rad) * 7;
          const cy = 16 + Math.sin(rad) * 7;
          return (
            <Ellipse key={i} cx={cx} cy={cy} rx="4.5" ry="3" fill={color}
              opacity={i % 2 === 0 ? "0.95" : "0.75"} transform={`rotate(${angle} ${cx} ${cy})`} />
          );
        })}
      </G>
      <Circle cx="16" cy="16" r="5.5" fill={centerColor} />
      <Circle cx="14.5" cy="15" r="1" fill="#F59E0B" opacity="0.7" />
      <Circle cx="17.5" cy="14.5" r="0.8" fill="#F59E0B" opacity="0.7" />
      <Circle cx="16" cy="17.5" r="0.9" fill="#F59E0B" opacity="0.7" />
    </Svg>
  );
}

// Test cell monster
export function MonsterIcon({ size, color = "#7C3AED" }: IconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 32 32">
      {/* Antennae */}
      <Rect x="8" y="2" width="3" height="5" rx="1.5" fill={color} />
      <Rect x="21" y="2" width="3" height="5" rx="1.5" fill={color} />
      {/* Body */}
      <Rect x="4" y="7" width="24" height="14" rx="3" fill={color} />
      {/* Eyes (white square blocks) */}
      <Rect x="8" y="11" width="5" height="5" rx="1" fill="white" />
      <Rect x="19" y="11" width="5" height="5" rx="1" fill="white" />
      {/* Pupils */}
      <Rect x="10" y="12" width="2.5" height="3" rx="0.5" fill={color} />
      <Rect x="21" y="12" width="2.5" height="3" rx="0.5" fill={color} />
      {/* Mouth — pixel style */}
      <Rect x="10" y="18" width="2" height="2" rx="0.3" fill="white" opacity="0.9" />
      <Rect x="15" y="18" width="2" height="2" rx="0.3" fill="white" opacity="0.9" />
      <Rect x="20" y="18" width="2" height="2" rx="0.3" fill="white" opacity="0.9" />
      {/* Side claws */}
      <Rect x="0" y="9" width="4" height="3" rx="1" fill={color} />
      <Rect x="28" y="9" width="4" height="3" rx="1" fill={color} />
      <Rect x="0" y="14" width="4" height="3" rx="1" fill={color} />
      <Rect x="28" y="14" width="4" height="3" rx="1" fill={color} />
      {/* Bottom legs (4 pairs — space invader style) */}
      <Rect x="6" y="21" width="3" height="5" rx="1" fill={color} />
      <Rect x="11" y="21" width="3" height="4" rx="1" fill={color} />
      <Rect x="18" y="21" width="3" height="4" rx="1" fill={color} />
      <Rect x="23" y="21" width="3" height="5" rx="1" fill={color} />
    </Svg>
  );
}

// HSK3: 森林 — tree
export function TreeIcon({ size, color = "#6EAF6E" }: IconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 32 32" opacity={0.6}>
      <Rect x="14" y="23" width="4" height="6" fill="#9B6B3A" rx="1" />
      <Polygon points="16,3 24,16 8,16" fill={color} />
      <Polygon points="16,9 25,22 7,22" fill={color} opacity="0.85" />
      <Polygon points="16,15 26,28 6,28" fill={color} opacity="0.7" />
    </Svg>
  );
}

export function CloudIcon({ size, color = "#7BB3D4" }: IconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 32 32" opacity={0.5}>
      <Ellipse cx="16" cy="20" rx="12" ry="7" fill={color} />
      <Ellipse cx="10" cy="18" rx="7" ry="6" fill={color} />
      <Ellipse cx="22" cy="17" rx="6" ry="5" fill={color} />
      <Ellipse cx="16" cy="14" rx="7" ry="6" fill={color} />
    </Svg>
  );
}

export function MountainIcon({ size, color = "#8BA8BE" }: IconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 32 32" opacity={0.5}>
      <Polygon points="16,4 30,28 2,28" fill={color} />
      <Polygon points="8,14 20,28 -4,28" fill={color} opacity="0.7" />
      <Polygon points="16,4 23,16 9,16" fill="white" opacity="0.35" />
    </Svg>
  );
}

// HSK2: 海 — wave
export function WaveIcon({ size, color = "#38A2D7" }: IconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 32 32" opacity={0.6}>
      <Path d="M2 12 Q6 8 10 12 Q14 16 18 12 Q22 8 26 12 Q29 15 30 12" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <Path d="M2 18 Q6 14 10 18 Q14 22 18 18 Q22 14 26 18 Q29 21 30 18" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.75" />
      <Path d="M2 24 Q6 20 10 24 Q14 28 18 24 Q22 20 26 24 Q29 27 30 24" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />
    </Svg>
  );
}

// HSK2 study cell — fish
export function FishIcon({ size, color = "#2196F3" }: IconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 32 32">
      <Path d="M6 16 Q10 10 20 13 Q26 10 28 16 Q26 22 20 19 Q10 22 6 16 Z" fill={color} opacity="0.9" />
      <Path d="M4 10 L8 16 L4 22 Z" fill={color} opacity="0.7" />
      <Circle cx="22" cy="14" r="1.5" fill="white" />
      <Circle cx="22.5" cy="13.5" r="0.6" fill="#1a1a2e" />
    </Svg>
  );
}

// HSK4: 熱帯 — palm tree
export function PalmIcon({ size, color = "#FF8C42" }: IconProps) {
  const s = size;
  const trunkColor = "#8B5E3C";
  return (
    <Svg width={s} height={s} viewBox="0 0 32 32" opacity={0.65}>
      <Path d="M15 30 Q14 22 16 14 Q17 22 17 30 Z" fill={trunkColor} strokeWidth="0" />
      <Ellipse cx="10" cy="12" rx="8" ry="4" fill={color} transform="rotate(-30 10 12)" opacity="0.9" />
      <Ellipse cx="22" cy="10" rx="8" ry="4" fill={color} transform="rotate(30 22 10)" opacity="0.9" />
      <Ellipse cx="16" cy="7" rx="7" ry="3.5" fill={color} opacity="0.85" />
      <Circle cx="16" cy="13" r="2.5" fill="#F4A261" />
      <Circle cx="14" cy="14" r="1.5" fill="#E76F51" opacity="0.7" />
      <Circle cx="18" cy="14" r="1.5" fill="#E76F51" opacity="0.7" />
    </Svg>
  );
}

// HSK5: 雪山 — snowflake
export function SnowflakeIcon({ size, color = "#90CAF9" }: IconProps) {
  const s = size;
  const arms = [0, 60, 120, 180, 240, 300];
  return (
    <Svg width={s} height={s} viewBox="0 0 32 32" opacity={0.65}>
      {arms.map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x2 = 16 + Math.cos(rad) * 12;
        const y2 = 16 + Math.sin(rad) * 12;
        const bx1 = 16 + Math.cos(rad) * 6 + Math.cos(rad + Math.PI / 2) * 3;
        const by1 = 16 + Math.sin(rad) * 6 + Math.sin(rad + Math.PI / 2) * 3;
        const bx2 = 16 + Math.cos(rad) * 6 - Math.cos(rad + Math.PI / 2) * 3;
        const by2 = 16 + Math.sin(rad) * 6 - Math.sin(rad + Math.PI / 2) * 3;
        return (
          <G key={i}>
            <Line x1="16" y1="16" x2={x2} y2={y2} stroke={color} strokeWidth="2" strokeLinecap="round" />
            <Line x1={bx1} y1={by1} x2={bx2} y2={by2} stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          </G>
        );
      })}
      <Circle cx="16" cy="16" r="2.5" fill={color} />
    </Svg>
  );
}

// HSK5 deco — snowy mountain
export function SnowyMountainIcon({ size, color = "#90A4AE" }: IconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 32 32" opacity={0.55}>
      <Polygon points="16,3 30,28 2,28" fill={color} />
      <Polygon points="8,13 20,28 -4,28" fill={color} opacity="0.65" />
      <Polygon points="16,3 21,13 11,13" fill="white" opacity="0.8" />
      <Polygon points="8,13 11,18 5,18" fill="white" opacity="0.5" />
      <Circle cx="8" cy="8" r="1.5" fill="white" opacity="0.6" />
      <Circle cx="24" cy="11" r="1" fill="white" opacity="0.5" />
      <Circle cx="20" cy="6" r="1.2" fill="white" opacity="0.5" />
    </Svg>
  );
}

// HSK6: 中国 — lantern
export function LanternIcon({ size, color = "#E53935" }: IconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 32 32" opacity={0.7}>
      <Rect x="13" y="2" width="6" height="3" rx="1.5" fill="#D4A017" />
      <Path d="M16 5 L16 7" stroke="#D4A017" strokeWidth="1.5" strokeLinecap="round" />
      <Ellipse cx="16" cy="16" rx="9" ry="12" fill={color} />
      <Ellipse cx="16" cy="16" rx="6" ry="10" fill={color} opacity="0.5" />
      <Line x1="7" y1="13" x2="25" y2="13" stroke="#D4A017" strokeWidth="1" opacity="0.6" />
      <Line x1="7" y1="16" x2="25" y2="16" stroke="#D4A017" strokeWidth="1" opacity="0.6" />
      <Line x1="7" y1="19" x2="25" y2="19" stroke="#D4A017" strokeWidth="1" opacity="0.6" />
      <Ellipse cx="16" cy="7" rx="3" ry="1.5" fill="#D4A017" />
      <Ellipse cx="16" cy="25" rx="3" ry="1.5" fill="#D4A017" />
      <Path d="M13 27 Q16 30 19 27" stroke="#D4A017" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <Circle cx="16" cy="16" r="3" fill="#FFD700" opacity="0.4" />
    </Svg>
  );
}

// HSK6 deco — cloud with gold
export function GoldCloudIcon({ size, color = "#FFD700" }: IconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 32 32" opacity={0.45}>
      <Ellipse cx="16" cy="20" rx="12" ry="7" fill={color} />
      <Ellipse cx="10" cy="18" rx="7" ry="6" fill={color} />
      <Ellipse cx="22" cy="17" rx="6" ry="5" fill={color} />
      <Ellipse cx="16" cy="14" rx="7" ry="6" fill={color} />
    </Svg>
  );
}

// HSK6: 都市 — city skyline (study cell)
export function BuildingIcon({ size, color = "#546E7A" }: IconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 32 32" opacity={0.75}>
      {/* Ground */}
      <Rect x="1" y="29" width="30" height="2" rx="1" fill={color} opacity="0.5" />
      {/* Tall center building */}
      <Rect x="12" y="6" width="8" height="23" rx="1" fill={color} />
      <Rect x="13" y="8" width="2" height="2" rx="0.5" fill="white" opacity="0.5" />
      <Rect x="17" y="8" width="2" height="2" rx="0.5" fill="white" opacity="0.5" />
      <Rect x="13" y="12" width="2" height="2" rx="0.5" fill="white" opacity="0.5" />
      <Rect x="17" y="12" width="2" height="2" rx="0.5" fill="white" opacity="0.5" />
      <Rect x="13" y="16" width="2" height="2" rx="0.5" fill="white" opacity="0.5" />
      <Rect x="17" y="16" width="2" height="2" rx="0.5" fill="white" opacity="0.5" />
      {/* Antenna */}
      <Rect x="15.5" y="3" width="1" height="4" rx="0.5" fill={color} />
      {/* Left building */}
      <Rect x="3" y="14" width="7" height="15" rx="1" fill={color} opacity="0.85" />
      <Rect x="4.5" y="16" width="1.5" height="2" rx="0.3" fill="white" opacity="0.4" />
      <Rect x="7" y="16" width="1.5" height="2" rx="0.3" fill="white" opacity="0.4" />
      <Rect x="4.5" y="20" width="1.5" height="2" rx="0.3" fill="white" opacity="0.4" />
      <Rect x="7" y="20" width="1.5" height="2" rx="0.3" fill="white" opacity="0.4" />
      {/* Right building */}
      <Rect x="22" y="11" width="7" height="18" rx="1" fill={color} opacity="0.85" />
      <Rect x="23" y="13" width="1.5" height="2" rx="0.3" fill="white" opacity="0.4" />
      <Rect x="25.5" y="13" width="1.5" height="2" rx="0.3" fill="white" opacity="0.4" />
      <Rect x="23" y="17" width="1.5" height="2" rx="0.3" fill="white" opacity="0.4" />
      <Rect x="25.5" y="17" width="1.5" height="2" rx="0.3" fill="white" opacity="0.4" />
      <Rect x="23" y="21" width="1.5" height="2" rx="0.3" fill="white" opacity="0.4" />
      <Rect x="25.5" y="21" width="1.5" height="2" rx="0.3" fill="white" opacity="0.4" />
    </Svg>
  );
}

// HSK6: 都市 — small building deco variant
export function SmallBuildingIcon({ size, color = "#546E7A" }: IconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 32 32" opacity={0.6}>
      <Rect x="2" y="29" width="28" height="2" rx="1" fill={color} opacity="0.4" />
      <Rect x="6" y="16" width="6" height="13" rx="1" fill={color} opacity="0.8" />
      <Rect x="7" y="18" width="1.5" height="2" rx="0.3" fill="white" opacity="0.5" />
      <Rect x="9.5" y="18" width="1.5" height="2" rx="0.3" fill="white" opacity="0.5" />
      <Rect x="13" y="9" width="7" height="20" rx="1" fill={color} />
      <Rect x="14" y="11" width="2" height="2" rx="0.3" fill="white" opacity="0.5" />
      <Rect x="17" y="11" width="2" height="2" rx="0.3" fill="white" opacity="0.5" />
      <Rect x="14" y="15" width="2" height="2" rx="0.3" fill="white" opacity="0.5" />
      <Rect x="17" y="15" width="2" height="2" rx="0.3" fill="white" opacity="0.5" />
      <Rect x="14" y="19" width="2" height="2" rx="0.3" fill="white" opacity="0.5" />
      <Rect x="17" y="19" width="2" height="2" rx="0.3" fill="white" opacity="0.5" />
      <Rect x="14.5" y="6" width="1" height="4" rx="0.5" fill={color} />
      <Rect x="21" y="18" width="5" height="11" rx="1" fill={color} opacity="0.7" />
      <Rect x="22" y="20" width="1.2" height="1.5" rx="0.3" fill="white" opacity="0.4" />
      <Rect x="24" y="20" width="1.2" height="1.5" rx="0.3" fill="white" opacity="0.4" />
    </Svg>
  );
}

// HSK2: 海 — sun over water
export function SunIcon({ size, color = "#FFB300" }: IconProps) {
  const s = size;
  const rays = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <Svg width={s} height={s} viewBox="0 0 32 32" opacity={0.65}>
      {rays.map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x1 = 16 + Math.cos(rad) * 8;
        const y1 = 16 + Math.sin(rad) * 8;
        const x2 = 16 + Math.cos(rad) * 13;
        const y2 = 16 + Math.sin(rad) * 13;
        return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="2" strokeLinecap="round" />;
      })}
      <Circle cx="16" cy="16" r="7" fill={color} />
      <Circle cx="16" cy="16" r="5" fill="#FFD54F" />
    </Svg>
  );
}

// HSK3: 森林 — mushroom
export function MushroomIcon({ size, color = "#E53935" }: IconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 32 32" opacity={0.65}>
      <Rect x="13" y="18" width="6" height="9" rx="2" fill="#D7CCC8" />
      <Path d="M4 18 Q4 6 16 6 Q28 6 28 18 Z" fill={color} />
      <Circle cx="11" cy="13" r="2.5" fill="white" opacity="0.7" />
      <Circle cx="19" cy="10" r="2" fill="white" opacity="0.7" />
      <Circle cx="22" cy="15" r="1.8" fill="white" opacity="0.7" />
    </Svg>
  );
}

// HSK2 (雪山): 杉の木 — cedar/fir tree
export function CedarTreeIcon({ size, color = "#37474F" }: IconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 32 32" opacity={0.8}>
      {/* Trunk */}
      <Rect x="14.5" y="25" width="3" height="5" rx="1" fill={color} opacity="0.7" />
      {/* Bottom layer (widest) */}
      <Polygon points="16,18 5,28 27,28" fill={color} opacity="0.7" />
      {/* Middle layer */}
      <Polygon points="16,12 7,22 25,22" fill={color} opacity="0.85" />
      {/* Top layer */}
      <Polygon points="16,6 9,16 23,16" fill={color} />
      {/* Tip */}
      <Polygon points="16,2 12.5,9 19.5,9" fill={color} />
      {/* Snow caps */}
      <Polygon points="16,2 12.5,7 19.5,7" fill="white" opacity="0.55" />
      <Polygon points="16,7 10,14 22,14" fill="white" opacity="0.3" />
    </Svg>
  );
}

// HSK6: 都市 — crescent moon
export function MoonIcon({ size, color = "#5C6BC0" }: IconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 32 32" opacity={0.75}>
      <Path
        d="M22 16 A10 10 0 1 1 16 6 A7 7 0 1 0 22 16 Z"
        fill={color}
      />
      <Circle cx="23" cy="9" r="1.2" fill={color} opacity="0.6" />
      <Circle cx="26" cy="13" r="0.8" fill={color} opacity="0.5" />
      <Circle cx="21" cy="6" r="0.7" fill={color} opacity="0.4" />
    </Svg>
  );
}

// HSK6: 都市 — star
export function StarIcon({ size, color = "#FFB300" }: IconProps) {
  const s = size;
  const points = Array.from({ length: 5 }, (_, i) => {
    const outer = (Math.PI / 2 + i * (2 * Math.PI / 5));
    const inner = outer + Math.PI / 5;
    const ox = 16 + 13 * Math.cos(outer);
    const oy = 16 - 13 * Math.sin(outer);
    const ix = 16 + 5.5 * Math.cos(inner);
    const iy = 16 - 5.5 * Math.sin(inner);
    return `${ox},${oy} ${ix},${iy}`;
  }).join(" ");
  return (
    <Svg width={s} height={s} viewBox="0 0 32 32" opacity={0.8}>
      <Polygon points={points} fill={color} />
    </Svg>
  );
}

// HSK6: 都市 — rocket
export function RocketIcon({ size, color = "#E53935" }: IconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 32 32" opacity={0.75}>
      {/* Body */}
      <Path d="M16 4 C12 4 9 10 9 18 L23 18 C23 10 20 4 16 4 Z" fill={color} />
      {/* Nose tip */}
      <Path d="M16 2 L13 6 L19 6 Z" fill={color} opacity="0.7" />
      {/* Window */}
      <Circle cx="16" cy="13" r="3" fill="white" opacity="0.7" />
      <Circle cx="16" cy="13" r="1.8" fill={color} opacity="0.5" />
      {/* Left fin */}
      <Path d="M9 18 L5 25 L11 22 Z" fill={color} opacity="0.8" />
      {/* Right fin */}
      <Path d="M23 18 L27 25 L21 22 Z" fill={color} opacity="0.8" />
      {/* Exhaust */}
      <Ellipse cx="14" cy="20" rx="1.5" ry="3" fill="#FF8F00" opacity="0.8" />
      <Ellipse cx="18" cy="20" rx="1.5" ry="3" fill="#FF8F00" opacity="0.8" />
      <Ellipse cx="16" cy="21" rx="2" ry="4" fill="#FFD54F" opacity="0.6" />
    </Svg>
  );
}

// HSK4: 熱帯 — tropical flower
export function TropicalFlowerIcon({ size, color = "#E91E63" }: IconProps) {
  const s = size;
  const angles = [0, 72, 144, 216, 288];
  return (
    <Svg width={s} height={s} viewBox="0 0 32 32">
      <G>
        {angles.map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const cx = 16 + Math.cos(rad) * 8;
          const cy = 16 + Math.sin(rad) * 8;
          return (
            <Ellipse key={i} cx={cx} cy={cy} rx="5" ry="3" fill={color}
              opacity="0.9" transform={`rotate(${angle} ${cx} ${cy})`} />
          );
        })}
      </G>
      <Circle cx="16" cy="16" r="5" fill="#FFEB3B" />
      <Circle cx="16" cy="16" r="2.5" fill="#FF8F00" />
    </Svg>
  );
}
