"use client";

import { useState } from "react";

export default function PdfDownloadButton({
  href,
  label,
  download,
  className,
}: {
  href: string;
  label: string;
  download?: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    // Open the tab synchronously, inside the click handler, so browsers don't
    // treat it as a popup — opening it after the await below gets blocked.
    const previewTab = download ? null : window.open("", "_blank");

    setLoading(true);
    try {
      const res = await fetch(href);
      if (!res.ok) throw new Error("failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (download) {
        const a = document.createElement("a");
        a.href = url;
        a.download = download;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else if (previewTab) {
        previewTab.location.href = url;
      } else {
        alert("ポップアップがブロックされました。ブラウザの設定でポップアップを許可してください。");
      }

      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch {
      previewTab?.close();
      alert("PDFの取得に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button type="button" onClick={handleClick} disabled={loading} className={className}>
      {loading ? "準備中..." : label}
    </button>
  );
}
