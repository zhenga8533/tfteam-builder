import { Grid, HStack, Image } from "@chakra-ui/react";
import { Champion } from "../hooks/useTFT";
import { convertToPng } from "../services/format";

interface ChampionsProps {
  champions: Champion[];
}

const Champions = ({ champions }: ChampionsProps) => {
  const costColor: { [key: number]: string } = {
    1: "gray",
    2: "green",
    3: "blue",
    4: "purple",
    5: "orange",
    6: "red",
    7: "yellow",
  };

  return (
    <>
      <HStack></HStack>
      <Grid gap={6} templateColumns="repeat(auto-fill, minmax(40px, 1fr))">
        {champions?.map(
          (champion) =>
            champion.cost < 8 && (
              <Image
                key={champion.apiName}
                src={"https://raw.communitydragon.org/latest/game/" + convertToPng(champion.tileIcon)}
                alt={champion.name}
                w="100%"
                border="1px solid black"
                outline={`2px solid ${costColor[champion.cost]}`}
              />
            )
        )}
      </Grid>
    </>
  );
};

export default Champions;
