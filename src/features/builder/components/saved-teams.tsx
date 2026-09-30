import { FolderOpen, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ChampionIcon } from "@/components/game/icons";
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useGameData } from "@/lib/data/hooks";
import { boardUnits } from "@/lib/game/board";
import { useBuilderStore } from "../store";
import { useBuilder } from "../use-builder";

interface ControlledProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaveTeamDialog({ open, onOpenChange }: ControlledProps) {
  const { set, board } = useBuilder();
  const saveTeam = useBuilderStore((state) => state.saveTeam);
  const savedCount = useBuilderStore((state) => state.saved.length);
  const [name, setName] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const team = saveTeam(name.trim() || `Team ${savedCount + 1}`, set, board);
    toast.success(`Saved "${team.name}".`);
    setName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Save team</DialogTitle>
            <DialogDescription>Saved teams are stored in this browser.</DialogDescription>
          </DialogHeader>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={`Team ${savedCount + 1}`}
            aria-label="Team name"
            autoFocus
            maxLength={60}
          />
          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SavedTeamsSheet({ open, onOpenChange }: ControlledProps) {
  const { championsByApi } = useGameData();
  const { set, load } = useBuilder();
  const saved = useBuilderStore((state) => state.saved);
  const deleteTeam = useBuilderStore((state) => state.deleteTeam);
  const teams = saved.filter((team) => team.set === set);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Saved teams</SheetTitle>
          <SheetDescription>Set {set} teams saved in this browser.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
          {teams.length === 0 && (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No saved teams for Set {set} yet.
            </p>
          )}
          {teams.map((team) => (
            <div key={team.id} className="space-y-2 rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2">
                <p className="flex-1 truncate font-medium">{team.name}</p>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    load(team.board);
                    onOpenChange(false);
                    toast.success(`Loaded "${team.name}".`);
                  }}
                >
                  <FolderOpen /> Load
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  onClick={() => deleteTeam(team.id)}
                  aria-label={`Delete ${team.name}`}
                >
                  <Trash2 />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {boardUnits(team.board).map((unit, index) => {
                  const champion = championsByApi.get(unit.apiName);
                  return champion ? <ChampionIcon key={index} champion={champion} className="size-8" /> : null;
                })}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
