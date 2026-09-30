import { closestCenter, type CollisionDetection, pointerWithin, type UniqueIdentifier } from "@dnd-kit/core";

export type DragPayload =
  { type: "champion"; apiName: string } | { type: "item"; apiName: string } | { type: "unit"; index: number };

export type DropPayload = { type: "hex"; index: number };

export const hexDropId = (index: number) => `hex-${index}`;
export const unitDragId = (index: number) => `unit-${index}`;

/**
 * Hex bounding boxes overlap by a quarter row, so rectangle-based detection can pick a neighbor.
 * Prefer the droppable under the pointer whose center is closest to it.
 */
export const hexCollision: CollisionDetection = (args) => {
  const pointer = args.pointerCoordinates;
  if (!pointer) return closestCenter(args);
  const distance = (id: UniqueIdentifier) => {
    const rect = args.droppableRects.get(id);
    return rect ? Math.hypot(rect.left + rect.width / 2 - pointer.x, rect.top + rect.height / 2 - pointer.y) : Infinity;
  };
  return pointerWithin(args).sort((a, b) => distance(a.id) - distance(b.id));
};
