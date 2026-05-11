"use client";

import { useMemo, useState } from "react";

function getStudentInitials(name) {
  const safeName = String(name || "").trim();
  if (!safeName) return "S";

  const letters = safeName
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  return letters.toUpperCase() || "S";
}

export default function StudentAvatar({
  src,
  alt,
  name,
  className = "",
  fallbackClassName = "",
  textClassName = "",
  fallbackLabel
}) {
  const [failedSrc, setFailedSrc] = useState("");

  const initials = useMemo(() => getStudentInitials(name), [name]);
  const shouldShowFallback = !src || failedSrc === src;

  if (shouldShowFallback) {
    return (
      <div
        className={fallbackClassName || className}
        aria-label={alt || name || "Student photo unavailable"}
      >
        <span className={textClassName}>
          {fallbackLabel || initials}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || name || "Student photo"}
      className={className}
      onError={() => setFailedSrc(src)}
    />
  );
}
