import { Box } from "@chakra-ui/react";
import { useState } from "react";
import { FaRegStar, FaStar } from "react-icons/fa";
import { Unit } from "../hooks/useTFT";

interface BoardStarsProps {
  unit: Unit;
}

const BoardStars = ({ unit }: BoardStarsProps) => {
  const [hovered, setHovered] = useState(0);

  return (
    <Box>
      {Array.from({ length: 3 }).map((_, index) => (
        <Box
          key={index}
          position="absolute"
          color="gold"
          top={index % 2 === 0 ? "0" : "-10px"}
          left={`${28 * index}px`}
          zIndex="1"
          fontSize="1.5em"
          onMouseEnter={() => setHovered(index + 1)}
          onMouseLeave={() => setHovered(0)}
        >
          {hovered > index || unit.starLevel > index ? <FaStar /> : <FaRegStar />}
        </Box>
      ))}
    </Box>
  );
};

export default BoardStars;
