import { Box } from "@chakra-ui/react";
import { MouseEvent, useState } from "react";
import { Unit } from "../hooks/useTFT";
import BoardStars from "./BoardStars";
import ChampionTile from "./ChampionTile";
import Hexagon from "./Hexagon";

interface BoardTileProps {
  champion: Unit | null;
  skins: boolean;
  rowIndex: number;
  colIndex: number;
  onDragStart: (rowIndex: number, colIndex: number) => void;
  onDrop: (rowIndex: number, colIndex: number) => void;
  onContextMenu: (event: MouseEvent) => void;
}

const BoardTile = ({ rowIndex, colIndex, champion, skins, onDragStart, onDrop, onContextMenu }: BoardTileProps) => {
  const [hovered, setHovered] = useState(false);

  return (
    <Box position="relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {champion !== null && <BoardStars unit={champion} show={hovered} />}
      <Box
        draggable
        onDragStart={() => onDragStart(rowIndex, colIndex)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={() => onDrop(rowIndex, colIndex)}
        onContextMenu={onContextMenu}
      >
        <Hexagon tile={<ChampionTile champion={champion} skins={skins} />} />
      </Box>
    </Box>
  );
};

export default BoardTile;
