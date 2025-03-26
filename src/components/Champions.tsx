import {
  Box,
  Button,
  Divider,
  Grid,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Switch,
  Text,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { BsSearch } from "react-icons/bs";
import { FaCoins } from "react-icons/fa";
import { Champion, Unit } from "../hooks/useTFT";
import ChampionTile from "./ChampionTile";

interface ChampionsProps {
  champions: Champion[];
  skins: boolean;
  setSkins: (skins: boolean) => void;
  team: (Unit | null)[][];
  setTeam: (team: (Unit | null)[][]) => void;
}

const Champions = ({ champions, skins, setSkins, setTeam, team }: ChampionsProps) => {
  const ref = useRef<HTMLInputElement>(null);
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

  const handleChampionClick = (champion: Champion) => {
    const newTeam = [...team];
    for (let row = 0; row < newTeam.length; row++) {
      for (let col = 0; col < newTeam[row].length; col++) {
        if (newTeam[row][col] === null) {
          newTeam[row][col] = {
            ...champion,
            items: [],
            starLevel: 1,
          };
          setTeam(newTeam);
          return;
        }
      }
    }
  };

  useEffect(() => {
    setSortedChampions(
      [...champions].sort((a, b) => {
        if (a.cost !== b.cost && !sorted) return a.cost - b.cost;
        else if (a.name === null) return 1;
        else if (b.name === null) return -1;
        else return a.name.localeCompare(b.name);
      })
    );
  }, [champions, sorted]);

  return (
    <Box background="gray.700" padding={3}>
      <HStack spacing={1}>
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
      <HStack my={1}>
        <Text color="gray.400">Set Skins</Text>
        <Switch isChecked={skins} onChange={() => setSkins(!skins)} />
      </HStack>
      <Divider />
      <Grid gap={6} my={3} templateColumns="repeat(auto-fill, minmax(40px, 1fr))">
        {sortedChampions?.map(
          (champion) =>
            champion.cost < 8 && (
              <Box key={champion.apiName} onClick={() => handleChampionClick(champion)}>
                <ChampionTile champion={champion} skins={skins} hoverInfo={true} showNames={false} />
              </Box>
            )
        )}
      </Grid>
    </Box>
  );
};

export default Champions;
