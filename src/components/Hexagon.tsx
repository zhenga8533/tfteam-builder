import { Box } from "@chakra-ui/react";

interface HexagonProps {
  imageUrl: string | null;
}

const Hexagon = ({ imageUrl }: HexagonProps) => (
  <Box
    height="80px"
    width="70px"
    bg="transparent"
    position="relative"
    _before={{
      content: `""`,
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      backgroundColor: "gray.700",
      backgroundImage: `url(${imageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
    }}
  />
);

export default Hexagon;
