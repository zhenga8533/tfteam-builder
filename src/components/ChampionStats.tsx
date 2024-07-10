import { Grid, GridItem, HStack, Image, Text } from "@chakra-ui/react";
import armor from "../assets/armor.webp";
import attack_speed from "../assets/attack_speed.webp";
import crit_chance from "../assets/crit_chance.webp";
import damage from "../assets/damage.webp";
import health from "../assets/health.webp";
import magic_resist from "../assets/magic_resist.webp";
import mana from "../assets/mana.webp";
import range from "../assets/range.webp";
import { Champion } from "../hooks/useTFT";

interface ChampionStatsProps {
  stats: Champion["stats"];
}

const ChampionStats = ({ stats }: ChampionStatsProps) => {
  return (
    <Grid templateColumns="repeat(2, 1fr)" columnGap={6} rowGap={1} mt={2}>
      <GridItem>
        <Text>Health</Text>
        <HStack>
          <Image boxSize="16px" src={health} />
          <Text>
            {Array.from({ length: 3 })
              .map((_, i) => Math.round(stats.hp * 1.8 ** i))
              .join(" / ")}
          </Text>
        </HStack>
      </GridItem>
      <GridItem>
        <Text>Damage</Text>
        <HStack>
          <Image boxSize="16px" src={damage} />
          <Text>
            {Array.from({ length: 3 })
              .map((_, i) => Math.round(stats.damage * 1.5 ** i))
              .join(" / ")}
          </Text>
        </HStack>
      </GridItem>
      <GridItem>
        <Text>Armor</Text>
        <HStack>
          <Image boxSize="16px" src={armor} />
          <Text>{stats.armor}</Text>
        </HStack>
      </GridItem>
      <GridItem>
        <Text>DPS</Text>
        <HStack>
          <Image boxSize="16px" src={crit_chance} />
          <Text>
            {Array.from({ length: 3 })
              .map((_, i) => Math.round(stats.damage * stats.attackSpeed * 1.5 ** i))
              .join(" / ")}
          </Text>
        </HStack>
      </GridItem>
      <GridItem>
        <Text>MR</Text>
        <HStack>
          <Image boxSize="16px" src={magic_resist} />
          <Text>{stats.magicResist}</Text>
        </HStack>
      </GridItem>
      <GridItem>
        <Text>Speed</Text>
        <HStack>
          <Image boxSize="16px" src={attack_speed} />
          <Text>{Math.round(stats.attackSpeed * 1000) / 1000}</Text>
        </HStack>
      </GridItem>
      <GridItem>
        <Text>Range</Text>
        <HStack>
          <Image boxSize="16px" src={range} />
          <Text>{stats.range}</Text>
        </HStack>
      </GridItem>
      <GridItem>
        <Text>Mana</Text>
        <HStack>
          <Image boxSize="16px" src={mana} />
          <Text>
            {stats.initialMana} / {stats.mana}
          </Text>
        </HStack>
      </GridItem>
    </Grid>
  );
};

export default ChampionStats;
