import { Box } from "@chakra-ui/react";
import { Item, Unit } from "../hooks/useTFT";
import ItemTile from "./ItemTile";

interface BoardItemsProps {
  colIndex: number;
  rowIndex: number;
  items: Item[];
  hoverInfo: boolean;
  onDragStart: (item: Item) => void;
  team: (Unit | null)[][];
  setTeam: (team: (Unit | null)[][]) => void;
}

const BoardItems = ({ colIndex, rowIndex, items, hoverInfo, onDragStart, team, setTeam }: BoardItemsProps) => {
  return (
    <Box>
      {items.map((item, index) => (
        <Box
          key={index}
          position="absolute"
          bottom={index % 2 === 0 ? "0" : "-10px"}
          boxSize="24px"
          left={`${32 * index - 4}px`}
          zIndex={1}
          onContextMenu={(event) => {
            const tile = team[rowIndex][colIndex];
            if (tile === null) return;

            event.preventDefault();
            const newTeam = [...team];
            tile.items.splice(index, 1);
            setTeam(newTeam);
          }}
        >
          <ItemTile item={item} hoverInfo={hoverInfo} onDragStart={onDragStart} />
        </Box>
      ))}
    </Box>
  );
};

export default BoardItems;
