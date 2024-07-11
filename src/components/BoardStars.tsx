import { Box } from "@chakra-ui/react";
import { useState } from "react";
import { FaRegStar, FaStar } from "react-icons/fa";
import { Unit } from "../hooks/useTFT";

interface BoardStarsProps {
  champion: Unit;
  colIndex: number;
  rowIndex: number;
  show: boolean;
  team: (Unit | null)[][];
  setTeam: (team: (Unit | null)[][]) => void;
}

const BoardStars = ({ champion, colIndex, rowIndex, show, team, setTeam }: BoardStarsProps) => {
  const [hovered, setHovered] = useState(0);

  const handleClick = (starLevel: number) => {
    const newTeam = [...team];
    newTeam[rowIndex][colIndex] = { ...newTeam[rowIndex][colIndex]!, starLevel };
    setTeam(newTeam);
  };

  return (
    <Box hidden={!show && champion.starLevel < 2}>
      {Array.from({ length: 3 }).map((_, index) => (
        <Box
          key={index}
          position="absolute"
          color="gold"
          top={index % 2 === 0 ? "0" : "-10px"}
          left={`${28 * index}px`}
          zIndex="1"
          fontSize="1.5em"
          onClick={() => handleClick(index + 1)}
          onMouseEnter={() => setHovered(index + 1)}
          onMouseLeave={() => setHovered(0)}
        >
          {hovered > index || champion.starLevel > index ? <FaStar /> : <FaRegStar />}
        </Box>
      ))}
    </Box>
  );
};

export default BoardStars;
