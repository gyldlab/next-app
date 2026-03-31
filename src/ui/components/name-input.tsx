import React from "react";
import { Box, Text } from "ink";

export interface NameInputProps {
  value: string;
}

export const NameInput: React.FC<NameInputProps> = ({ value }) => {
  return (
    <>
      <Text> </Text>
      <Text bold>Enter project name:</Text>
      <Text> </Text>
      <Box>
        <Text color="cyan">❯ </Text>
        <Text>{value}</Text>
        <Text color="cyan">█</Text>
      </Box>
      <Text> </Text>
      <Text dimColor>Use '.' for current directory. Press Enter to continue, Escape to exit.</Text>
    </>
  );
};
