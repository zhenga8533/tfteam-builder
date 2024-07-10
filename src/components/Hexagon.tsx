import { Box } from "@chakra-ui/react";
import React from "react";

interface HexagonProps {
  image: JSX.Element;
}

const Hexagon = ({ image }: HexagonProps) => (
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
      {React.cloneElement(image, {
        style: { width: "100%", height: "100%", objectFit: "cover" },
      })}
    </Box>
  </Box>
);

export default Hexagon;
