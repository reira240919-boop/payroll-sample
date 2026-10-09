import BackButton from "@/components/BackButton";
import TransferNoticeMailSetting from "@/components/TransferNoticeMailSetting";
import { getTransferNoticeMailTemplate } from "@/lib/settings";

export default async function TransferAmountsSettingsPage() {
  const template = await getTransferNoticeMailTemplate();

  return (
    <div className="space-y-6">
      <BackButton label="入金・振込に戻る" fallbackHref="/admin/transfer-amounts" />
      <h2 className="text-xl font-bold">入金・振込の設定</h2>

      <TransferNoticeMailSetting initialSubject={template.subject} initialBody={template.body} />
    </div>
  );
}
