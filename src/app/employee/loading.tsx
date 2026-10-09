import Spinner from "@/components/Spinner";

export default function Loading() {
  return (
    <div className="flex items-center gap-2 py-10 text-sm text-slate-500">
      <Spinner />
      読み込み中...
    </div>
  );
}
