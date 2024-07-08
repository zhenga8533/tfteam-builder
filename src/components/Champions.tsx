import { Grid, HStack, Switch, Text } from "@chakra-ui/react";
import { useState } from "react";
import { Champion } from "../hooks/useTFT";
import ChampionImage from "./ChampionImage";

interface ChampionsProps {
  champions: Champion[];
}

const Champions = ({ champions }: ChampionsProps) => {
  const [useSkins, setUseSkins] = useState(true);

  return (
    <>
      <HStack></HStack>
      <Grid gap={6} templateColumns="repeat(auto-fill, minmax(40px, 1fr))">
        {champions?.map(
          (champion) =>
            champion.cost < 8 && <ChampionImage key={champion.apiName} champion={champion} useSkins={useSkins} />
        )}
      </Grid>
      <HStack mt={3}>
        <Text>Set Skins</Text>
        <Switch isChecked={useSkins} onChange={() => setUseSkins(!useSkins)} />
      </HStack>
    </>
  );
};

export default Champions;
