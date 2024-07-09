import { Box, HStack, Image, Text, Tooltip, VStack } from "@chakra-ui/react";
import { FaCoins } from "react-icons/fa";
import { formatSkin, parseDescription } from "../services/format";
import ChampionImage, { ChampionImageProps } from "./ChampionImage";

const ChampionTile = ({ champion, useSkins }: ChampionImageProps) => {
  return (
    <Tooltip
      key={champion.apiName}
      background="gray.800"
      hasArrow
      placement="right"
      label={
        <VStack textColor="white" mt={1}>
          <HStack alignItems="center">
            <VStack spacing={1}>
              <Box boxSize="40px">
                <ChampionImage champion={champion} useSkins={useSkins} />
              </Box>
              <Text fontWeight="bold">{champion.name}</Text>
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
          <HStack>
            <VStack alignItems="center" textAlign="center" spacing={0} width="148px">
              <Image boxSize="40px" src={formatSkin(champion.ability.icon)} />
              <Text fontSize="sm">{champion.ability.name}</Text>
            </VStack>
            <Text dangerouslySetInnerHTML={{ __html: parseDescription(champion.ability.desc) }}></Text>
          </HStack>
        </VStack>
      }
    >
      <Box>
        <ChampionImage champion={champion} useSkins={useSkins} />
      </Box>
    </Tooltip>
  );
};

export default ChampionTile;
