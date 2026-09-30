import { Hammer } from "lucide-react";
import { PageHeader } from "./page-header";

export function ComingSoon({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-24 text-muted-foreground">
        <Hammer className="size-8" />
        <p>Under construction.</p>
      </div>
    </>
  );
}
