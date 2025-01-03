import { Text, VStack } from "@chakra-ui/react";

const Footer = () => {
  return (
    <VStack spacing={3}>
      <Text>
        TFTeam Builder isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone
        officially involved in producing or managing League of Legends. League of Legends and Riot Games are trademarks
        or registered trademarks of Riot Games, Inc. League of Legends © Riot Games, Inc.
      </Text>
      <Text>© TFTeam Builder 2024</Text>
    </VStack>
  );
};

export default Footer;
