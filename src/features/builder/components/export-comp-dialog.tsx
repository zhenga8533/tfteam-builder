import { ClipboardCopy, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { compFileName, compSource } from "@/content/serialize";
import { useBuilder } from "../use-builder";

interface ExportCompDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportCompDialog({ open, onOpenChange }: ExportCompDialogProps) {
  const { set, boards } = useBuilder();
  const [name, setName] = useState("");
  // Comp guides hold a final board and an optional early board: the highest and lowest levels.
  const source = compSource({
    name,
    set,
    board: boards.at(-1)?.board ?? [],
    early: boards.length > 1 ? boards[0]?.board : undefined,
  });
  const fileName = compFileName(name);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(source);
      toast.success("Comp file copied.");
    } catch {
      toast.error("Couldn't access the clipboard.");
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([source], { type: "text/typescript" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: fileName });
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export as comp file</DialogTitle>
          <DialogDescription>
            Save this as{" "}
            <code className="text-foreground">
              src/content/comps/set{set}/{fileName}
            </code>
            , fill in the tier, summary and augments, then run <code className="text-foreground">npm run format</code>.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Comp name"
          aria-label="Comp name"
          autoFocus
        />
        <pre className="max-h-80 overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
          <code>{source}</code>
        </pre>
        <DialogFooter>
          <Button variant="outline" onClick={download}>
            <Download /> Download
          </Button>
          <Button onClick={copy}>
            <ClipboardCopy /> Copy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
