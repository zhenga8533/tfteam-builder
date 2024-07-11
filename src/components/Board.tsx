import { Box, HStack, VStack } from "@chakra-ui/react";
import { useState } from "react";
import { Unit } from "../hooks/useTFT";
import ChampionTile from "./ChampionTile";
import Hexagon from "./Hexagon";

interface BoardProps {
  skins: boolean;
  team: (Unit | null)[][];
  setTeam: (team: (Unit | null)[][]) => void;
}

const Board = ({ skins, team, setTeam }: BoardProps) => {
  const [dragged, setDragged] = useState<{ rowIndex: number; colIndex: number } | null>(null);

  const handleDragStart = (rowIndex: number, colIndex: number) => {
    setDragged({ rowIndex, colIndex });
  };

  const handleDrop = (targetRowIndex: number, targetColIndex: number) => {
    if (!dragged) return;

    const newTeam = [...team];
    [newTeam[dragged.rowIndex][dragged.colIndex], newTeam[targetRowIndex][targetColIndex]] = [
      newTeam[targetRowIndex][targetColIndex],
      newTeam[dragged.rowIndex][dragged.colIndex],
    ];

    setTeam(newTeam);
    setDragged(null);
  };

  return (
    <VStack mx={10} spacing={0}>
      {team.map((row, rowIndex) => (
        <Box key={`row-${rowIndex}`} mt="-10px">
          <HStack
            display="flex"
            flexDirection="row"
            ml={rowIndex % 2 ? "48px" : "0px"}
            mr={rowIndex % 2 ? "0px" : "48px"}
            spacing={4}
          >
            {row.map((champion, colIndex) => (
              <Box
                key={`hex-${rowIndex}-${colIndex}`}
                draggable
                onDragStart={() => handleDragStart(rowIndex, colIndex)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDrop(rowIndex, colIndex)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  const newTeam = [...team];
                  newTeam[rowIndex][colIndex] = null;
                  setTeam(newTeam);
                }}
              >
                <Hexagon tile={<ChampionTile champion={champion} skins={skins} />} />
              </Box>
            ))}
          </HStack>
        </Box>
      ))}
    </VStack>
  );
};

export default Board;
