import React, { memo } from 'react';
import { Box, Text } from 'ink';
import { COLOR } from '../config';
import type { Group } from '../types';

export type GroupRowProps = {
  group: Group;
  index: number;
  active: boolean;
  moveMode: boolean;
  renameValue: string | null;
  renameSelected: boolean;
};

export const GroupRow = memo<GroupRowProps>(
  ({ group, index, active, moveMode, renameValue, renameSelected }) => {
    const isRenaming = renameValue !== null;
    const triangle = group.collapsed ? '▸' : '▾';
    const cursor = active ? (moveMode ? '↕ ' : '▶ ') : '  ';
    return (
      <Box>
        <Text color={COLOR.active} bold>{cursor}</Text>
        <Text color={COLOR.dim}>[{index + 1}] </Text>
        <Text color={COLOR.title} bold>{triangle} </Text>
        {isRenaming ? (
          renameSelected ? (
            <Text inverse color={COLOR.title} bold>{renameValue}</Text>
          ) : (
            <Text color={COLOR.title} bold>{`${renameValue}█`}</Text>
          )
        ) : (
          <Text color={active ? COLOR.active : COLOR.title} bold>{group.name}</Text>
        )}
        <Text color={COLOR.dim}>  ({group.children.length})</Text>
      </Box>
    );
  },
);
