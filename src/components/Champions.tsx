import {
  Box,
  Button,
  Grid,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Switch,
  Text,
  Tooltip,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { BsSearch } from "react-icons/bs";
import { FaCoins } from "react-icons/fa";
import { Champion } from "../hooks/useTFT";
import ChampionImage from "./ChampionImage";

interface ChampionsProps {
  champions: Champion[];
}

const Champions = ({ champions }: ChampionsProps) => {
  const ref = useRef<HTMLInputElement>(null);
  const [useSkins, setUseSkins] = useState(true);
  const [sorted, setSorted] = useState(false);
  const [sortedChampions, setSortedChampions] = useState<Champion[]>(champions);

  const filterChampions = (search: string) => {
    if (search === "") return champions;
    return champions.filter(
      (champion) =>
        champion.name.toLowerCase().includes(search.toLowerCase()) ||
        champion.traits.some((trait) => trait.toLowerCase().includes(search.toLowerCase())) ||
        champion.cost.toString().includes(search)
    );
  };

  useEffect(() => {
    setSortedChampions(
      [...champions].sort((a, b) => {
        if (a.cost !== b.cost && !sorted) {
          return a.cost - b.cost;
        }
        return a.name.localeCompare(b.name);
      })
    );
  }, [champions, sorted]);

  return (
    <Box background="gray.700" padding={3}>
      <HStack mb={2} spacing={1}>
        <InputGroup>
          <InputLeftElement children={<BsSearch />} />
          <Input
            borderRadius={1}
            name="search"
            placeholder="Search by name, trait, or cost..."
            ref={ref}
            variant="filled"
            onChange={() => setSortedChampions(filterChampions(ref.current?.value || ""))}
          />
        </InputGroup>
        <Button borderRadius={3} colorScheme={sorted ? "blue" : "gray"} onClick={() => setSorted(true)}>
          A-Z
        </Button>
        <Button borderRadius={3} colorScheme={sorted ? "gray" : "blue"} onClick={() => setSorted(false)}>
          <FaCoins size={24} />
        </Button>
      </HStack>
      <hr />
      <Grid gap={6} my={3} templateColumns="repeat(auto-fill, minmax(40px, 1fr))">
        {sortedChampions?.map((champion) =>
          champion.cost < 8 ? (
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
          ) : null
        )}
      </Grid>
      <hr />
      <HStack mt={1}>
        <Text>Set Skins</Text>
        <Switch isChecked={useSkins} onChange={() => setUseSkins(!useSkins)} />
      </HStack>
    </Box>
  );
};

export default Champions;
