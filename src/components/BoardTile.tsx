import { Box } from "@chakra-ui/react";
import { MouseEvent, useState } from "react";
import { Unit } from "../hooks/useTFT";
import BoardItems from "./BoardItems";
import BoardStars from "./BoardStars";
import ChampionTile from "./ChampionTile";
import Hexagon from "./Hexagon";

interface BoardTileProps {
  colIndex: number;
  rowIndex: number;
  champion: Unit | null;
  hoverInfo: boolean;
  onContextMenu: (event: MouseEvent) => void;
  onDragUnit: (rowIndex: number, colIndex: number) => void;
  onDropUnit: (rowIndex: number, colIndex: number) => void;
  onDropItem: (rowIndex: number, colIndex: number) => void;
  showNames: boolean;
  skins: boolean;
  team: (Unit | null)[][];
  setTeam: (team: (Unit | null)[][]) => void;
}

const BoardTile = ({
  colIndex,
  rowIndex,
  champion,
  hoverInfo,
  onContextMenu,
  onDragUnit,
  onDropUnit,
  onDropItem,
  showNames,
  skins,
  team,
  setTeam,
}: BoardTileProps) => {
  const [hovered, setHovered] = useState(false);

  return (
    <Box position="relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {champion !== null && (
        <BoardStars
          champion={champion}
          colIndex={colIndex}
          rowIndex={rowIndex}
          show={hovered}
          team={team}
          setTeam={setTeam}
        />
      )}
      <Box
        draggable
        onDragStart={() => onDragUnit(rowIndex, colIndex)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={() => {
          onDropUnit(rowIndex, colIndex);
          onDropItem(rowIndex, colIndex);
        }}
        onContextMenu={onContextMenu}
      >
        <Hexagon
          color="gray.700"
          size="80px"
          tile={<ChampionTile champion={champion} skins={skins} hoverInfo={hoverInfo} showNames={showNames} />}
        />
      </Box>
      {champion !== null && (
        <BoardItems colIndex={colIndex} rowIndex={rowIndex} items={champion.items} team={team} setTeam={setTeam} />
      )}
    </Box>
  );
};

export default BoardTile;
