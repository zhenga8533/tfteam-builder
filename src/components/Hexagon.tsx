import { Box } from "@chakra-ui/react";

interface HexagonProps {
  color: string;
  size: string;
  tile: JSX.Element;
}

const Hexagon = ({ color, size, tile }: HexagonProps) => (
  <Box height={size} width={size} bg="transparent" position="relative">
    <Box
      position="absolute"
      top="0"
      left="0"
      width="100%"
      height="100%"
      backgroundColor={color}
      clipPath="polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)"
      overflow="hidden"
    >
      {tile}
    </Box>
  </Box>
);

export default Hexagon;
