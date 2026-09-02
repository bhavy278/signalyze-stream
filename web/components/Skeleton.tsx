import type { CSSProperties } from "react";

export function Skeleton({
  w = "100%",
  h = 12,
  r = 8,
  style,
}: {
  w?: number | string;
  h?: number | string;
  r?: number;
  style?: CSSProperties;
}) {
  return (
    <span
      className="skeleton"
      style={{ display: "block", width: w, height: h, borderRadius: r, ...style }}
    />
  );
}
