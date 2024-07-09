import { Image } from "@chakra-ui/react";
import { useState } from "react";
import { Champion } from "../hooks/useTFT";
import { formatSkin } from "../services/format";

export interface ChampionImageProps {
  champion: Champion;
  useSkins: boolean;
}

const ChampionImage = ({ champion, useSkins }: ChampionImageProps) => {
  const costColor: { [key: number]: string } = {
    1: "gray",
    2: "green",
    3: "blue",
    4: "purple",
    5: "orange",
    6: "red",
    7: "yellow",
  };

  const getRawImage = (name: string) => {
    name = name.toLowerCase().replace(/[^a-z]/g, "");
    return `https://raw.communitydragon.org/latest/game/assets/characters/${name}/hud/${name}_square.png`;
  };
  const getRawFallback = (name: string) => {
    name = name.toLowerCase().replace(/[^a-z]/g, "");
    return `https://raw.communitydragon.org/latest/game/assets/characters/${name}/hud/${name}_square_0.png`;
  };

  const [imgSrc, setImgSrc] = useState(getRawImage(champion.name));
  const handleError = () => {
    if (imgSrc === getRawImage(champion.name)) {
      setImgSrc(getRawFallback(champion.name));
    } else {
      setImgSrc(formatSkin(champion.tileIcon));
    }
  };

  return (
    <Image
      key={champion.apiName}
      src={useSkins ? formatSkin(champion.tileIcon) : imgSrc}
      onError={handleError}
      alt={champion.name}
      w="100%"
      border="1px solid black"
      outline={`2px solid ${costColor[champion.cost]}`}
    />
  );
};

export default ChampionImage;
