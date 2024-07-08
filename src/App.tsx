import { Grid, GridItem, Text } from "@chakra-ui/react";
import "./App.css";
import Board from "./components/Board";

function App() {
  return (
    <Grid
      gap={6}
      templateAreas={`"header header header"
                      "traits board equipped"
                      "traits champions items"
                      "footer footer footer"`}
      templateColumns="20% 60% 20%"
      w="100%"
    >
      <GridItem gridArea="header">
        <Text fontSize="2xl">TFT Team Builder</Text>
      </GridItem>
      <GridItem gridArea="traits">
        <Text>Traits</Text>
      </GridItem>
      <GridItem gridArea="board">
        <Board />
      </GridItem>
      <GridItem gridArea="equipped">
        <Text>Equipped</Text>
      </GridItem>
      <GridItem gridArea="champions">
        <Text>Champions</Text>
      </GridItem>
      <GridItem gridArea="items">
        <Text>Items</Text>
      </GridItem>
      <GridItem gridArea="footer">
        <Text>Footer</Text>
      </GridItem>
    </Grid>
  );
}

export default App;
