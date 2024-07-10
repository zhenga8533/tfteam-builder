import { HStack, Image, Text } from "@chakra-ui/react";
import ability_power from "../assets/ability_power.webp";
import armor from "../assets/armor.webp";
import attack_speed from "../assets/attack_speed.webp";
import damage from "../assets/damage.webp";
import health from "../assets/health.webp";
import magic_resist from "../assets/magic_resist.webp";
import mana from "../assets/mana.webp";
import range from "../assets/range.webp";
import { Item } from "../hooks/useTFT";

interface ItemStatsProps {
  effects: Item["effects"];
}

const ItemStats = ({ effects }: ItemStatsProps) => {
  const stats: { [key: string]: { name: string; icon: string } } = {
    AD: {
      name: "AD",
      icon: damage,
    },
    AP: {
      name: "AP",
      icon: ability_power,
    },
    AS: {
      name: "AP",
      icon: attack_speed,
    },
    HexRangeIncrease: {
      name: "Range",
      icon: range,
    },
    Armor: {
      name: "Armor",
      icon: armor,
    },
    MagicResist: {
      name: "MR",
      icon: magic_resist,
    },
    Health: {
      name: "HP",
      icon: health,
    },
    Mana: {
      name: "Mana",
      icon: mana,
    },
  };
  const keys = Object.keys(stats);

  return (
    <HStack spacing={3}>
      {Object.entries(effects).map(([key, value]) => {
        if (!keys.includes(key)) return null;
        return (
          <HStack key={key} spacing={1}>
            <Text>{stats[key].name}:</Text>
            <Text>{value < 1 ? Math.round(value * 100) : value}</Text>
            <Image boxSize="16px" src={stats[key].icon} />
          </HStack>
        );
      })}
    </HStack>
  );
};

export default ItemStats;
