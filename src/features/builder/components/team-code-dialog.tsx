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
import { useActiveSet, useGameData } from "@/lib/data/hooks";
import { useSettings } from "@/stores/settings";
import { addChampion, type Board, createBoard } from "../board";
import { decodeTeamCode, teamCodeSet } from "../team-code";
import { useBuilder } from "../use-builder";

interface TeamCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportTeamCodeDialog({ open, onOpenChange }: TeamCodeDialogProps) {
  const { champions } = useGameData();
  const { set, sets } = useActiveSet();
  const setActiveSet = useSettings((state) => state.setSet);
  const { load } = useBuilder();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const codeSet = teamCodeSet(code);
  const otherSet = codeSet !== null && codeSet !== set ? codeSet : null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (otherSet !== null) return;
    const result = decodeTeamCode(code, champions);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const board = result.apiNames.reduce<Board>((next, apiName) => addChampion(next, apiName) ?? next, createBoard());
    load(board);
    toast.success(`Imported ${result.apiNames.length} champions.`);
    setCode("");
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Import team code</DialogTitle>
            <DialogDescription>
              Paste a code copied from the in-game Team Planner. Codes only include champions, not positions or items.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              setError(null);
            }}
            placeholder="02…TFTSet18"
            aria-label="Team code"
            aria-invalid={error !== null}
            autoFocus
            className="font-mono"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          {otherSet !== null && (
            <div className="flex items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">
              <span>
                This code is for Set {otherSet}
                {sets.includes(otherSet) ? "." : ", which isn't available."}
              </span>
              {sets.includes(otherSet) && (
                <Button type="button" size="sm" variant="secondary" onClick={() => setActiveSet(otherSet)}>
                  Switch to Set {otherSet}
                </Button>
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={!code.trim() || otherSet !== null}>
              Import
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
