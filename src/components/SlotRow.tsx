import React, { memo } from 'react';
import { Box, Text } from 'ink';
import { COLOR } from '../config';
import type { Slot } from '../types';

export type SlotRowProps = {
  slot: Slot;
  index: number;
  active: boolean;
  indent: number;
  moveMode: boolean;
  renameValue: string | null;
};

export const SlotRow = memo<SlotRowProps>(
  ({ slot, index, active, indent, moveMode, renameValue }) => {
    const label = renameValue !== null ? `${renameValue}█` : slot.name;
    const dotColor =
      slot.status === 'alive' ? COLOR.alive :
      slot.status === 'dead' ? COLOR.dead :
      COLOR.fresh;
    const cursor = active ? (moveMode ? '↕ ' : '▶ ') : '  ';
    const pad = '  '.repeat(indent);
    return (
      <Box>
        <Text>{pad}</Text>
        <Text color={COLOR.active} bold>{cursor}</Text>
        <Text color={COLOR.dim}>[{index + 1}] </Text>
        <Text color={dotColor}>● </Text>
        <Text color={active ? COLOR.active : undefined} bold={active}>
          {label.padEnd(14)}
        </Text>
        <Text color={COLOR.dim}>  {slot.session}</Text>
      </Box>
    );
  },
);
