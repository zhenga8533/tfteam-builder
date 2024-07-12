import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  config: {
    initialColorMode: "dark",
    useSystemColorMode: false,
  },
  colors: {
    tier: {
      0: "#1A202C",
      1: "#CD7F32",
      2: "#C0C0C0",
      3: "#FFA500",
      4: "#B76E79",
    },
  },
});

export default theme;
