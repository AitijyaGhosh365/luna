import React, { memo } from 'react';
import { Box, Text } from 'ink';
import { BANNER, COLOR, TAGLINE } from '../config';

export const Banner = memo(() => (
  <Box flexDirection="column" alignSelf="center">
    {BANNER.map((line, i) => (
      <Text key={i} color={COLOR.title} bold>
        {line}
      </Text>
    ))}
    <Box marginTop={1} alignSelf="center">
      <Text color={COLOR.dim}>{TAGLINE}</Text>
    </Box>
  </Box>
));
