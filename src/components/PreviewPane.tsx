import React, { memo } from 'react';
import { Box, Text } from 'ink';
import { COLOR } from '../config';
import type { Status } from '../types';

export type PreviewPaneProps = {
  lines: string[] | null;
  visibleLines: number;
  width: number;
  status: Status;
  borderColor: string;
};

export const PreviewPane = memo<PreviewPaneProps>(
  ({ lines, visibleLines, width, status, borderColor }) => {
    const previewLen = lines?.length ?? 0;
    const sliceEnd = previewLen;
    const sliceStart = Math.max(0, sliceEnd - visibleLines);
    const visible = lines
      ? lines.slice(sliceStart, sliceEnd).map((l) => l.slice(0, width))
      : [];
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={borderColor}
        paddingX={1}
        marginTop={1}
        flexGrow={1}
        overflow="hidden"
      >
        <Box justifyContent="space-between">
          <Text color={COLOR.dim} bold> preview</Text>
          {previewLen > 0 && (
            <Text color={COLOR.dim}>
              {previewLen <= visibleLines
                ? `[${previewLen} lines] `
                : `[${sliceStart + 1}-${sliceEnd}/${previewLen}] `}
            </Text>
          )}
        </Box>
        {visible.length > 0 ? (
          visible.map((line, i) => <Text key={i}>{line}</Text>)
        ) : (
          <Text color={COLOR.dim}>
            {status === 'alive' ? '(no output yet)' : '(session not alive)'}
          </Text>
        )}
      </Box>
    );
  },
);
