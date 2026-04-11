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
  const skinColor = "#A78BFA";
  return (
    <Svg width={s} height={s} viewBox="0 0 32 32">
      <Ellipse cx="16" cy="17" rx="12" ry="11" fill={color} />
      <Rect x="4" y="6" width="24" height="14" rx="8" fill={color} />
      <Path d="M4 16 L4 22 L7 19 L10 22 L13 19 L16 22 L19 19 L22 22 L25 19 L28 22 L28 16 Z" fill={color} />
      <Circle cx="11" cy="11" r="4" fill="white" />
      <Circle cx="21" cy="11" r="4" fill="white" />
      <Circle cx="12" cy="12" r="2.5" fill="#1F1F2E" />
      <Circle cx="22" cy="12" r="2.5" fill="#1F1F2E" />
      <Circle cx="12.8" cy="11.2" r="0.9" fill="white" />
      <Circle cx="22.8" cy="11.2" r="0.9" fill="white" />
      <Path d="M9 19 L11 16 L13 19 L15 16 L17 19 L19 16 L21 19 L23 16" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Polygon points="6,6 8,2 10,6" fill={skinColor} />
      <Polygon points="14,4 16,0 18,4" fill={skinColor} />
      <Polygon points="22,6 24,2 26,6" fill={skinColor} />
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
