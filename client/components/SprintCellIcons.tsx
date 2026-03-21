import React from "react";
import Svg, { Circle, Ellipse, Path, Rect, Polygon, G } from "react-native-svg";

interface IconProps {
  size: number;
  color?: string;
}

export function PlantIcon({ size, color = "#5B8C85" }: IconProps) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 32 32">
      <Path
        d="M16 28 L16 14"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <Ellipse
        cx="10"
        cy="16"
        rx="6"
        ry="4"
        fill={color}
        opacity="0.9"
        transform="rotate(-20 10 16)"
      />
      <Ellipse
        cx="22"
        cy="13"
        rx="6"
        ry="4"
        fill={color}
        opacity="0.85"
        transform="rotate(20 22 13)"
      />
      <Ellipse
        cx="14"
        cy="10"
        rx="4.5"
        ry="3"
        fill={color}
        transform="rotate(-10 14 10)"
      />
      <Path
        d="M15 28 Q14 26 13 25"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
    </Svg>
  );
}

export function FlowerIcon({ size, color = "#E8956F" }: IconProps) {
  const s = size;
  const petalColor = color;
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
            <Ellipse
              key={i}
              cx={cx}
              cy={cy}
              rx="4.5"
              ry="3"
              fill={petalColor}
              opacity={i % 2 === 0 ? "0.95" : "0.75"}
              transform={`rotate(${angle} ${cx} ${cy})`}
            />
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

export function MonsterIcon({ size, color = "#7C3AED" }: IconProps) {
  const s = size;
  const bodyColor = color;
  const skinColor = "#A78BFA";
  return (
    <Svg width={s} height={s} viewBox="0 0 32 32">
      <Ellipse cx="16" cy="17" rx="12" ry="11" fill={bodyColor} />
      <Rect x="4" y="6" width="24" height="14" rx="8" fill={bodyColor} />
      <Path d="M4 16 L4 22 L7 19 L10 22 L13 19 L16 22 L19 19 L22 22 L25 19 L28 22 L28 16 Z" fill={bodyColor} />

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
