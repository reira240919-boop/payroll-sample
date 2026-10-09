import BackButton from "@/components/BackButton";
import InvoiceOptionManager from "@/components/InvoiceOptionManager";

export default function InvoiceSettingsPage() {
  return (
    <div className="space-y-6">
      <BackButton label="請求書一覧に戻る" fallbackHref="/admin/invoices" />
      <h2 className="text-xl font-bold">請求書の設定</h2>

      <InvoiceOptionManager
        type="unit"
        title="単位"
        description="請求項目の入力画面で選択できる単位の一覧です。追加・修正・削除できます。"
        placeholder="例：本"
      />
      <InvoiceOptionManager
        type="deduction"
        title="控除項目"
        description="控除項目の入力画面で選択できる内容の一覧です。ここにない内容は直接入力できます。"
        placeholder="例：前払金相殺"
      />
      <InvoiceOptionManager
        type="group"
        title="グループ名の候補"
        description="請求項目にグループを追加するときに選択できる候補です。ここにない名前は直接入力できます。"
        placeholder="例：①労務費"
      />
      <InvoiceOptionManager
        type="tax_charge"
        title="請求項目の概要（税区分）"
        description="請求項目の「概要」で選択できる税区分の一覧です。"
        placeholder="例：10%対象"
      />
      <InvoiceOptionManager
        type="tax_deduction"
        title="控除項目の概要（税区分）"
        description="控除項目の「概要」で選択できる税区分の一覧です。"
        placeholder="例：8%対象"
      />
    </div>
  );
}
