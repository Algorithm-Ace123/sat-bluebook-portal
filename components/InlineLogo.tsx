"use client";

export default function InlineLogo({ className, alt = "Pramana Logo" }: { className?: string; alt?: string }) {
  // Fallback PNG base64 in case static asset is blocked by deployment protection or CSP
  const FALLBACK = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjYwIiB2aWV3Qm94PSIwIDAgMTYwIDYwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxNjAiIGhlaWdodD0iNjAiIHJ4PSI4IiBmaWxsPSIjM2I4MmY2Ii8+PHRleHQgeD0iODAiIHk9IjM1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgc3R5bGU9ImZvbnQ6IGJvbGQgMjBweCBzYW5zLXNlcmlmIj5QcmFtYW5hPC90ZXh0Pjwvc3ZnPg==";
  return (
    // Use the public file by default; if the request is blocked we'll fallback to in-memory base64 string
    <img
      src="/logo.png"
      alt={alt}
      className={className}
      onError={(e) => {
        (e.target as HTMLImageElement).src = FALLBACK;
      }}
    />
  );
}
