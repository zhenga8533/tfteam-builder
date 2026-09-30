export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">{children}</p>;
}
