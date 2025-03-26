import { Image } from "@chakra-ui/react";
import { useState } from "react";
import icon from "../assets/placeholder.webp";
import { Champion } from "../hooks/useTFT";
import { formatSkin } from "../services/format";

export interface ChampionImageProps {
  champion: Champion | null;
  skins: boolean;
}

const ChampionImage = ({ champion, skins }: ChampionImageProps) => {
  if (champion === null) return null;

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
    } else if (imgSrc === getRawFallback(champion.name)) {
      setImgSrc(icon);
    } else {
      setImgSrc(formatSkin(champion.tileIcon || champion.squareIcon));
    }
  };

  return (
    <Image
      key={champion.apiName}
      src={skins ? formatSkin(champion.tileIcon || champion.squareIcon) : imgSrc}
      onError={handleError}
      alt={champion.name}
      w="100%"
      border="1px solid black"
      outline={`2px solid ${costColor[champion.cost]}`}
    />
  );
};

export default ChampionImage;
