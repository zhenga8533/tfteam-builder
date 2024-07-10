import { Box, HStack, VStack } from "@chakra-ui/react";
import { Champion } from "../hooks/useTFT";
import ChampionTile from "./ChampionTile";
import Hexagon from "./Hexagon";

interface BoardProps {
  team: (Champion | null)[][];
}

const Board = ({ team }: BoardProps) => {
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
              <Hexagon
                key={`hex-${rowIndex}-${colIndex}`}
                tile={<ChampionTile champion={champion} useSkins={true} />}
              />
            ))}
          </HStack>
        </Box>
      ))}
    </VStack>
  );
};

export default Board;
