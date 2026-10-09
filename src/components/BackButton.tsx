"use client";

import { useRouter } from "next/navigation";

export default function BackButton({
  label,
  fallbackHref,
}: {
  label: string;
  fallbackHref: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
      className="mb-4 inline-block text-sm text-blue-600 hover:underline"
    >
      ← {label}
    </button>
  );
}
