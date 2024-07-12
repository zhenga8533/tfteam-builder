import { Box, HStack, Switch, Text, VStack } from "@chakra-ui/react";
import { useState } from "react";
import { Unit } from "../hooks/useTFT";
import BoardCost from "./BoardCost";
import BoardTile from "./BoardTile";

interface BoardProps {
  skins: boolean;
  team: (Unit | null)[][];
  setTeam: (team: (Unit | null)[][]) => void;
}

const Board = ({ skins, team, setTeam }: BoardProps) => {
  const [dragged, setDragged] = useState<{ rowIndex: number; colIndex: number } | null>(null);
  const [showNames, setShowNames] = useState(true);

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
        <Box key={`row-${rowIndex}`} mt="-6px">
          <HStack
            display="flex"
            flexDirection="row"
            ml={rowIndex % 2 ? "48px" : "0px"}
            mr={rowIndex % 2 ? "0px" : "48px"}
            spacing={4}
          >
            {row.map((champion, colIndex) => (
              <BoardTile
                key={`tile-${rowIndex}-${colIndex}`}
                champion={champion}
                skins={skins}
                rowIndex={rowIndex}
                colIndex={colIndex}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                onContextMenu={(event) => {
                  event.preventDefault();
                  const newTeam = [...team];
                  newTeam[rowIndex][colIndex] = null;
                  setTeam(newTeam);
                }}
                team={team}
                setTeam={setTeam}
                showNames={showNames}
              />
            ))}
          </HStack>
        </Box>
      ))}
      <HStack justifyContent="space-between" mt={3} w="100%">
        <HStack>
          <Text color="gray.400">Names</Text>
          <Switch isChecked={showNames} onChange={() => setShowNames(!showNames)} />
        </HStack>
        <BoardCost team={team} />
      </HStack>
    </VStack>
  );
};

export default Board;
