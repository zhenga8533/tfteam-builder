import { Box, HStack, VStack } from "@chakra-ui/react";
import Hexagon from "./Hexagon";

const Board = () => {
  const numRows = 4;
  const numCols = 7;

  const renderRow = (rowIndex: number) => {
    return (
      <HStack
        display="flex"
        flexDirection="row"
        ml={rowIndex % 2 ? "45px" : "0px"}
        mr={rowIndex % 2 ? "0px" : "45px"}
        spacing={4}
      >
        {Array.from({ length: numCols }).map((_, colIndex) => (
          <Hexagon imageUrl={null} key={`hex-${rowIndex}-${colIndex}`} />
        ))}
      </HStack>
    );
  };

  return (
    <VStack mx={10} spacing={0}>
      {Array.from({ length: numRows }).map((_, rowIndex) => (
        <Box key={`row-${rowIndex}`} mt="-10px">
          {renderRow(rowIndex)}
        </Box>
      ))}
    </VStack>
  );
};

export default Board;
