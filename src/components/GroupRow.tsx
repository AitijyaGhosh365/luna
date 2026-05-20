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
};

export const GroupRow = memo<GroupRowProps>(
  ({ group, index, active, moveMode, renameValue }) => {
    const label = renameValue !== null ? `${renameValue}█` : group.name;
    const triangle = group.collapsed ? '▸' : '▾';
    const cursor = active ? (moveMode ? '↕ ' : '▶ ') : '  ';
    return (
      <Box>
        <Text color={COLOR.active} bold>{cursor}</Text>
        <Text color={COLOR.dim}>[{index + 1}] </Text>
        <Text color={COLOR.title} bold>{triangle} </Text>
        <Text color={active ? COLOR.active : COLOR.title} bold>{label}</Text>
        <Text color={COLOR.dim}>  ({group.children.length})</Text>
      </Box>
    );
  },
);
