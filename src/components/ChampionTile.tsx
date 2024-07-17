import { Box, Divider, HStack, Image, Text, Tooltip, VStack } from "@chakra-ui/react";
import { FaCoins } from "react-icons/fa";
import { formatName, formatSkin } from "../services/format";
import ChampionImage, { ChampionImageProps } from "./ChampionImage";
import ChampionStats from "./ChampionStats";

interface ChampionStatsProps extends ChampionImageProps {
  hoverInfo: boolean;
  showNames: boolean;
}

const ChampionTile = ({ champion, skins, hoverInfo, showNames }: ChampionStatsProps) => {
  if (champion === null) return null;

  const tile = (
    <Box position="relative" display="flex" alignItems="center" justifyContent="center">
      <ChampionImage champion={champion} skins={skins} />
      <Text position="absolute" color="white" textShadow="1px 1px 2px black" hidden={!showNames}>
        {formatName(champion.name)}
      </Text>
    </Box>
  );

  const label = (
    <VStack textColor="white" mt={1}>
      <HStack alignItems="center">
        <VStack spacing={1}>
          <Box boxSize="40px">
            <ChampionImage champion={champion} skins={skins} />
          </Box>
          <Text fontWeight="bold">{formatName(champion.name)}</Text>
        </VStack>
        <Box height="70px" width="1px" bgColor="gray.600" mx={1} />
        <VStack spacing={0}>
          {champion.traits.map((trait) => (
            <Text key={trait}>{formatName(trait)}</Text>
          ))}
          {champion.traits.length === 0 && <Text>Traitless</Text>}
        </VStack>
        <Box height="70px" width="1px" bgColor="gray.600" mx={1} />
        <HStack>
          <FaCoins />
          <Text>{champion.cost}</Text>
        </HStack>
      </HStack>
      <Divider />
      <ChampionStats stats={champion.stats} />
      <Divider />
      <HStack mb={1}>
        <VStack alignItems="center" textAlign="center" spacing={0} width="148px">
          <Image boxSize="40px" src={formatSkin(champion.ability.icon)} />
          <Text fontSize="sm">{"Mortdog." || champion.ability.name}</Text>
        </VStack>
        <Text
        /** dangerouslySetInnerHTML={{
            __html: parseDescription(
              champion.ability.desc,
              Object.fromEntries(
                Object.entries(champion.ability.variables).map(([_, value]) => [value.name, value.value?.[0]])
              )
            ),
          }}*/
        >
          broke this...
        </Text>
      </HStack>
    </VStack>
  );

  if (!hoverInfo) return tile;
  return (
    <Tooltip background="gray.800" borderRadius={3} hasArrow placement="right" label={label}>
      {tile}
    </Tooltip>
  );
};

export default ChampionTile;
