import { HStack, Image, Text } from "@chakra-ui/react";
import ability_power from "../assets/ability_power.webp";
import armor from "../assets/armor.webp";
import attack_speed from "../assets/attack_speed.webp";
import crit_chance from "../assets/crit_chance.webp";
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
    Armor: {
      name: "Armor",
      icon: armor,
    },
    AS: {
      name: "AP",
      icon: attack_speed,
    },
    CritChance: {
      name: "CC",
      icon: crit_chance,
    },
    Health: {
      name: "HP",
      icon: health,
    },
    HexRangeIncrease: {
      name: "Range",
      icon: range,
    },
    MagicResist: {
      name: "MR",
      icon: magic_resist,
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
            <Text>{Number.isInteger(value) ? value : Math.round(value * 100)}</Text>
            <Image boxSize="16px" src={stats[key].icon} />
          </HStack>
        );
      })}
    </HStack>
  );
};

export default ItemStats;
