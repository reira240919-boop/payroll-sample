"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MailedCheckbox({
  invoiceId,
  initialMailed,
}: {
  invoiceId: string;
  initialMailed: boolean;
}) {
  const router = useRouter();
  const [mailed, setMailed] = useState(initialMailed);
  const [saving, setSaving] = useState(false);

  async function handleChange(checked: boolean) {
    setMailed(checked);
    setSaving(true);
    await fetch(`/api/invoices/${invoiceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mailed: checked }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <label className="flex items-center gap-1.5 text-sm text-slate-600">
      <input
        type="checkbox"
        checked={mailed}
        disabled={saving}
        onChange={(e) => handleChange(e.target.checked)}
      />
      郵送済み
    </label>
  );
}
