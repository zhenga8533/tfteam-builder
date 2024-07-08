import { Box, Button, Grid, HStack, Input, InputGroup, InputLeftElement, Switch, Text } from "@chakra-ui/react";
import { useRef, useState } from "react";
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
          />
        </InputGroup>
        <Button borderRadius={1}>A-Z</Button>
        <Button>
          <FaCoins size={24} />
        </Button>
      </HStack>
      <hr />
      <Grid gap={6} my={3} templateColumns="repeat(auto-fill, minmax(40px, 1fr))">
        {champions?.map(
          (champion) =>
            champion.cost < 8 && <ChampionImage key={champion.apiName} champion={champion} useSkins={useSkins} />
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
