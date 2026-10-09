import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import BackButton from "@/components/BackButton";
import InvoiceEditor from "@/components/InvoiceEditor";

type Props = { params: Promise<{ contractorId: string; invoiceId: string }> };

export default async function InvoiceEditPage({ params }: Props) {
  const { contractorId, invoiceId } = await params;

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.contractorId !== contractorId) notFound();

  return (
    <div>
      <BackButton
        label="プレビューに戻る"
        fallbackHref={`/admin/invoices/${contractorId}/${invoiceId}`}
      />
      <h2 className="mb-4 text-xl font-bold">請求書編集</h2>
      <InvoiceEditor invoiceId={invoiceId} />
    </div>
  );
}
