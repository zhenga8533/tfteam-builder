import { useEffect, useState } from "react";

export interface Item {
  apiName: string;
  associatedTraits: string[];
  composition: string[];
  desc: string;
  effects: {
    [key: string]: number;
  };
  from: string;
  icon: string;
  id: string;
  incompatibleTraits: string[];
  name: string;
  unique: boolean;
}

export interface Champion {
  ability: {
    desc: string;
    icon: string;
    name: string;
    variables: {
      [key: string]: {
        name: string;
        value: number[];
      };
    };
  };
  apiName: string;
  characterName: string;
  cost: number;
  icon: string;
  name: string;
  squareIcon: string;
  stats: {
    armor: number;
    attackSpeed: number;
    critChance: number;
    critMultiplier: number;
    damage: number;
    hp: number;
    initialMana: number;
    magicResist: number;
    mana: number;
    range: number;
  };
  tileIcon: string;
  traits: string[];
}

export interface Trait {
  apiName: string;
  desc: string;
  effects: {
    maxUnits: number;
    minUnits: number;
    style: string;
    variables: {
      [key: string]: number;
    };
  }[];
  icon: string;
  name: string;
}

export interface Unit extends Champion {
  items: Item[];
  starLevel: number;
}

interface TFTData {
  items: Item[];
  setData: {
    champions: Champion[];
    mutators: string;
    name: string;
    number: number;
    traits: Trait[];
  };
  sets: {
    [key: string]: {
      champions: Champion[];
      name: string;
      traits: Trait[];
    };
  };
}

const useTFT = () => {
  const [data, setData] = useState<TFTData>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("https://raw.communitydragon.org/pbe/cdragon/tft/en_us.json");
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const jsonData = await response.json();
        setData(jsonData);
        console.log(jsonData);
      } catch (error: any) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
};

export default useTFT;
