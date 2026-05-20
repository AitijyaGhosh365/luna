import React, { memo } from 'react';
import { Box, Text } from 'ink';
import { COLOR } from '../config';
import { formatCreated, shortPath } from '../utils';
import type { Info, Status } from '../types';

export type InfoCardProps = {
  focusedName: string;
  focusedStatus: Status;
  dotColor: string;
  info: Info | null;
  cwdWidth: number;
  borderColor: string;
};

export const InfoCard = memo<InfoCardProps>(
  ({ focusedName, focusedStatus, dotColor, info, cwdWidth, borderColor }) => (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      paddingX={2}
      height={7}
      flexShrink={0}
      overflow="hidden"
    >
      <Box>
        <Text color={COLOR.title} bold wrap="truncate">{focusedName}</Text>
        <Text color={COLOR.dim}>  </Text>
        <Text color={dotColor}>● </Text>
        <Text color={COLOR.dim}>{focusedStatus}</Text>
      </Box>
      {info ? (
        <Box flexDirection="column" marginTop={1}>
          <Box>
            <Text color={COLOR.dim}>cwd      </Text>
            <Text wrap="truncate">{shortPath(info.cwd, cwdWidth)}</Text>
          </Box>
          <Box>
            <Text color={COLOR.dim}>cmd      </Text>
            <Text wrap="truncate">{info.cmd}</Text>
          </Box>
          <Box>
            <Text color={COLOR.dim}>created  </Text>
            <Text wrap="truncate">{formatCreated(info.created)}</Text>
          </Box>
        </Box>
      ) : (
        <Box marginTop={1}>
          <Text color={COLOR.dim}>
            {focusedStatus === 'fresh' ? '(not opened yet)' :
             focusedStatus === 'dead' ? '(session destroyed)' :
             '(loading…)'}
          </Text>
        </Box>
      )}
    </Box>
  ),
);
