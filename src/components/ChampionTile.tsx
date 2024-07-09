import { Box, HStack, Text, Tooltip, VStack } from "@chakra-ui/react";
import { FaCoins } from "react-icons/fa";
import ChampionImage, { ChampionImageProps } from "./ChampionImage";

interface ChampionTileProps extends ChampionImageProps {}

const ChampionTile = ({ champion, useSkins }: ChampionTileProps) => {
  return (
    <Tooltip
      key={champion.apiName}
      background="gray.800"
      hasArrow
      placement="right"
      label={
        <HStack alignItems="center" pt={1} textColor="white">
          <VStack spacing={1}>
            <Box boxSize="40px">
              <ChampionImage champion={champion} useSkins={useSkins} />
            </Box>
            <Text>{champion.name}</Text>
          </VStack>
          <Box height="70px" width="1px" bgColor="gray.600" mx={1} />
          <VStack spacing={0}>
            {champion.traits.map((trait) => (
              <Text key={trait}>{trait}</Text>
            ))}
            {champion.traits.length === 0 && <Text>Traitless</Text>}
          </VStack>
          <Box height="70px" width="1px" bgColor="gray.600" mx={1} />
          <HStack>
            <FaCoins />
            <Text>{champion.cost}</Text>
          </HStack>
        </HStack>
      }
    >
      <Box>
        <ChampionImage champion={champion} useSkins={useSkins} />
      </Box>
    </Tooltip>
  );
};

export default ChampionTile;
