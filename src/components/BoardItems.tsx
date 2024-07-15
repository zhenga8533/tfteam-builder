import { Box, Image } from "@chakra-ui/react";
import { Item, Unit } from "../hooks/useTFT";
import { formatSkin } from "../services/format";

interface BoardItemsProps {
  colIndex: number;
  rowIndex: number;
  items: Item[];
  team: (Unit | null)[][];
  setTeam: (team: (Unit | null)[][]) => void;
}

const BoardItems = ({ colIndex, rowIndex, items, team, setTeam }: BoardItemsProps) => {
  return (
    <Box>
      {items.map((item, index) => (
        <Image
          key={index}
          src={formatSkin(item.icon)}
          alt={item.name}
          position="absolute"
          bottom={index % 2 === 0 ? "0" : "-10px"}
          boxSize="24px"
          left={`${32 * index - 4}px`}
          zIndex={1}
          onContextMenu={(event) => {
            const tile = team[colIndex][rowIndex];
            if (tile === null) return;

            event.preventDefault();
            const newTeam = [...team];
            tile.items.splice(index, 1);
            setTeam(newTeam);
          }}
        />
      ))}
    </Box>
  );
};

export default BoardItems;
