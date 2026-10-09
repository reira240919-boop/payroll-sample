import BackButton from "@/components/BackButton";
import PayrollOptionManager from "@/components/PayrollOptionManager";
import ReviewMailSetting from "@/components/ReviewMailSetting";
import { getPresidentEmail, getReviewMailTemplate } from "@/lib/settings";

export default async function ApprovalsSettingsPage() {
  const [presidentEmail, reviewMailTemplate] = await Promise.all([
    getPresidentEmail(),
    getReviewMailTemplate(),
  ]);

  return (
    <div className="space-y-6">
      <BackButton label="承認・確定に戻る" fallbackHref="/admin/approvals" />
      <h2 className="text-xl font-bold">承認・確定の設定</h2>

      <ReviewMailSetting
        initialEmail={presidentEmail}
        initialSubject={reviewMailTemplate.subject}
        initialBody={reviewMailTemplate.body}
      />

      <PayrollOptionManager
        type="quantity_unit"
        title="支給行の数量の単位"
        description="給与明細の支給行で、数量の横に選択できる単位の一覧です。「入力なし」は数量が関係ない行向けです。"
        placeholder="例：日"
      />
    </div>
  );
}
