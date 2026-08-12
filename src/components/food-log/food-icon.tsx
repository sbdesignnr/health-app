"use client";

import { useState } from "react";
import { categoryMeta } from "@/lib/food-categories";

// Reálna fotka (naskenované produkty) alebo farebná dlaždica s ikonou kategórie.
export function FoodIcon({
  category,
  imageUrl,
  size = 44,
  className = "",
}: {
  category: string | null;
  imageUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const meta = categoryMeta(category);
  const px = `${size}px`;

  if (imageUrl && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        width={size}
        height={size}
        onError={() => setBroken(true)}
        className={`shrink-0 rounded-xl object-cover ${className}`}
        style={{ width: px, height: px, backgroundColor: "var(--color-surface-3)" }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-xl ${className}`}
      style={{
        width: px,
        height: px,
        backgroundColor: `${meta.color}22`,
        boxShadow: `inset 0 0 0 1px ${meta.color}33`,
        fontSize: size * 0.5,
        lineHeight: 1,
      }}
    >
      {meta.icon}
    </span>
  );
}
