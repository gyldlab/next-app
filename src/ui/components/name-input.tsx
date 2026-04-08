import React from "react";
import { Text } from "ink";

export interface NameInputProps {
  value: string;
}

export const NameInput: React.FC<NameInputProps> = ({ value }) => {
  return (
    <>
      <Text> </Text>
      <Text bold>Enter project name:</Text>
      <Text> </Text>
      <Text wrap="truncate-end">
        <Text color="cyan">❯ </Text>
        <Text>{value}</Text>
        <Text color="cyan">█</Text>
      </Text>
      <Text> </Text>
      <Text dimColor wrap="truncate-end">
        Use '.' for current directory. Press Enter to continue, Escape to exit.
      </Text>
    </>
  );
};
