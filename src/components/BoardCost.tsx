import { HStack, Image, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import champion from "../assets/champion.webp";
import gold from "../assets/gold.webp";
import { Unit } from "../hooks/useTFT";

interface BoardCostProps {
  team: (Unit | null)[][];
}

const BoardCost = ({ team }: BoardCostProps) => {
  const [cost, setCost] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cost = 0;
    let count = 0;

    team.forEach((row) => {
      row.forEach((champion) => {
        if (champion) {
          cost += champion.cost * 3 ** (champion.starLevel - 1);
          count++;
        }
      });
    });

    setCost(cost);
    setCount(count);
  }, [team]);

  return (
    <HStack spacing={3} fontSize="large">
      <HStack spacing={1}>
        <Image src={champion} alt="Champion" boxSize="20px" />
        <Text>{count}</Text>
      </HStack>
      <HStack spacing={1}>
        <Image src={gold} alt="Gold" boxSize="20px" />
        <Text>{cost}</Text>
      </HStack>
    </HStack>
  );
};

export default BoardCost;
