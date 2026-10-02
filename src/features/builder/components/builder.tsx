import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useState } from "react";
import { ChampionIcon, ItemIcon } from "@/components/game/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGameData } from "@/lib/data/hooks";
import { type DragPayload, type DropPayload, hexCollision } from "../dnd";
import { useBuilder } from "../use-builder";
import { ChampionPool } from "./champion-pool";
import { HexBoard } from "./hex-board";
import { ItemPool } from "./item-pool";
import { AutofillButton } from "./autofill-button";
import { LevelTabs } from "./level-tabs";
import { TeamToolbar } from "./team-toolbar";
import { TraitPanel } from "./trait-panel";
import { UnitInspector } from "./unit-inspector";

function DragPreview({ payload }: { payload: DragPayload }) {
  const { championsByApi, itemsByApi } = useGameData();
  const { board } = useBuilder();

  if (payload.type === "item") {
    const item = itemsByApi.get(payload.apiName);
    return item ? <ItemIcon item={item} className="size-10 shadow-lg" /> : null;
  }
  const apiName = payload.type === "champion" ? payload.apiName : board[payload.index]?.apiName;
  const champion = apiName ? championsByApi.get(apiName) : undefined;
  return champion ? <ChampionIcon champion={champion} className="size-14 shadow-lg" /> : null;
}

export function Builder() {
  const { board, place, move, remove, equip } = useBuilder();
  const [dragging, setDragging] = useState<DragPayload | null>(null);
  const sensors = useSensors(
    // A small activation distance keeps clicks (add / select) working on draggable elements.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const onDragStart = ({ active }: DragStartEvent) => setDragging(active.data.current as DragPayload);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null);
    const payload = active.data.current as DragPayload;
    const target = over?.data.current as DropPayload | undefined;

    if (payload.type === "unit") {
      if (target?.type === "hex") move(payload.index, target.index);
      else remove(payload.index);
      return;
    }
    if (target?.type !== "hex") return;
    if (payload.type === "champion") place(target.index, payload.apiName);
    else if (board[target.index]) equip(target.index, payload.apiName);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={hexCollision}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] xl:grid-cols-[14rem_minmax(0,1fr)_18rem]">
        <div className="space-y-3 lg:col-start-2">
          {/* Autofill fills the selected level, so it sits with the level tabs rather than the team actions. */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <LevelTabs />
            <AutofillButton />
          </div>
          <TeamToolbar />
          <HexBoard />
        </div>
        <TraitPanel className="lg:col-start-1 lg:row-span-2 lg:row-start-1" />
        <UnitInspector className="xl:col-start-3 xl:row-span-2 xl:row-start-1 xl:self-start" />
        <Tabs defaultValue="champions" className="lg:col-start-2">
          <TabsList>
            <TabsTrigger value="champions">Champions</TabsTrigger>
            <TabsTrigger value="items">Items</TabsTrigger>
          </TabsList>
          <TabsContent value="champions" className="pt-2">
            <ChampionPool />
          </TabsContent>
          <TabsContent value="items" className="pt-2">
            <ItemPool />
          </TabsContent>
        </Tabs>
      </div>
      <DragOverlay dropAnimation={null}>{dragging && <DragPreview payload={dragging} />}</DragOverlay>
    </DndContext>
  );
}
