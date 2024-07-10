import { Box } from "@chakra-ui/react";

interface HexagonProps {
  tile: JSX.Element;
}

const Hexagon = ({ tile }: HexagonProps) => (
  <Box height="80px" width="70px" bg="transparent" position="relative">
    <Box
      position="absolute"
      top="0"
      left="0"
      width="100%"
      height="100%"
      backgroundColor={"gray.700"}
      clipPath="polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)"
      overflow="hidden"
    >
      <Box w="114%">{tile}</Box>
    </Box>
  </Box>
);

export default Hexagon;
