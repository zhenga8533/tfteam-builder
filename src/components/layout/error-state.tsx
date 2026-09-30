import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({ error }: { error: unknown }) {
  const router = useRouter();
  const { reset } = useQueryErrorResetBoundary();

  const retry = () => {
    reset();
    void router.invalidate();
  };

  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <TriangleAlert className="size-10 text-destructive" />
      <div className="space-y-1">
        <h2 className="font-display text-xl font-semibold">Something went wrong</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "An unexpected error occurred."}
        </p>
      </div>
      <Button variant="secondary" onClick={retry}>
        Try again
      </Button>
    </div>
  );
}
