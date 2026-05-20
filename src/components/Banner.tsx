import React, { memo } from 'react';
import { Box, Text } from 'ink';
import { BANNER, COLOR, TAGLINE } from '../config';

export const Banner = memo(() => (
  <Box height={4} flexDirection="column">
    <Box flexDirection="column" alignItems='center' justifyContent='center' >

    {BANNER.map((line, i) => (
      <Text key={i} color={COLOR.title} bold>
        {line}
      </Text>
    ))}
    </Box>
    <Text> </Text>
    <Box  alignSelf="center">
      <Text color={COLOR.yellow}>☽ </Text><Text color={COLOR.active}>{TAGLINE}</Text><Text color={COLOR.yellow}> ☾</Text>
    </Box>
  </Box>
));
