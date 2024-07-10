import { Box, HStack, VStack } from "@chakra-ui/react";
import { Champion } from "../hooks/useTFT";
import ChampionTile from "./ChampionTile";
import Hexagon from "./Hexagon";

interface BoardProps {
  skins: boolean;
  team: (Champion | null)[][];
  setTeam: (team: (Champion | null)[][]) => void;
}

const Board = ({ skins, team, setTeam }: BoardProps) => {
  return (
    <VStack mx={10} spacing={0}>
      {team.map((row, rowIndex) => (
        <Box key={`row-${rowIndex}`} mt="-10px">
          <HStack
            display="flex"
            flexDirection="row"
            ml={rowIndex % 2 ? "45px" : "0px"}
            mr={rowIndex % 2 ? "0px" : "45px"}
            spacing={4}
          >
            {row.map((champion, colIndex) => (
              <Box
                onContextMenu={(event) => {
                  event.preventDefault();
                  const newTeam = [...team];
                  newTeam[rowIndex][colIndex] = null;
                  setTeam(newTeam);
                }}
              >
                <Hexagon
                  key={`hex-${rowIndex}-${colIndex}`}
                  tile={<ChampionTile champion={champion} skins={skins} />}
                />
              </Box>
            ))}
          </HStack>
        </Box>
      ))}
    </VStack>
  );
};

export default Board;
