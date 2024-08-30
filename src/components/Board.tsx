import { Box, HStack, Switch, Text, VStack } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { Item, Unit } from "../hooks/useTFT";
import BoardCost from "./BoardCost";
import BoardTile from "./BoardTile";

interface BoardProps {
  skins: boolean;
  team: (Unit | null)[][];
  setTeam: (team: (Unit | null)[][]) => void;
  onDragItem: (item: Item) => void;
  onDropItem: (rowIndex: number, colIndex: number) => void;
}

const Board = ({ skins, team, setTeam, onDragItem, onDropItem }: BoardProps) => {
  const [dragged, setDragged] = useState<{ rowIndex: number; colIndex: number } | null>(null);
  const [hoverInfo, setHoverInfo] = useState(localStorage.getItem("hoverInfo") === "true");
  const [showNames, setShowNames] = useState(localStorage.getItem("showNames") !== "false");

  useEffect(() => {
    localStorage.setItem("hoverInfo", hoverInfo.toString());
  }, [hoverInfo]);
  useEffect(() => {
    localStorage.setItem("showNames", showNames.toString());
  }, [showNames]);

  const handleDragUnit = (rowIndex: number, colIndex: number) => {
    setDragged({ rowIndex, colIndex });
  };

  const handleDropUnit = (targetRowIndex: number, targetColIndex: number) => {
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
                colIndex={colIndex}
                rowIndex={rowIndex}
                champion={champion}
                hoverInfo={hoverInfo}
                onContextMenu={(event) => {
                  event.preventDefault();
                  const newTeam = [...team];
                  newTeam[rowIndex][colIndex] = null;
                  setTeam(newTeam);
                }}
                onDragUnit={handleDragUnit}
                onDropUnit={handleDropUnit}
                onDragItem={onDragItem}
                onDropItem={onDropItem}
                showNames={showNames}
                skins={skins}
                team={team}
                setTeam={setTeam}
              />
            ))}
          </HStack>
        </Box>
      ))}
      <HStack justifyContent="space-between" mt={3} w="100%">
        <HStack spacing={5}>
          <HStack>
            <Text color="gray.400">Hover Info</Text>
            <Switch isChecked={hoverInfo} onChange={() => setHoverInfo(!hoverInfo)} />
          </HStack>
          <HStack>
            <Text color="gray.400">Show Names</Text>
            <Switch isChecked={showNames} onChange={() => setShowNames(!showNames)} />
          </HStack>
        </HStack>
        <BoardCost team={team} />
      </HStack>
    </VStack>
  );
};

export default Board;
