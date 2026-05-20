import { readFileSync } from 'node:fs';
import { PREVIEW_BUFFER } from './config';
import type { Info, Snapshot } from './types';

const tmuxConfig = JSON.parse(
  readFileSync(new URL('../tmux-commands.json', import.meta.url), 'utf8'),
) as { commands: string[] };

export const buildScript = (session: string): string =>
  tmuxConfig.commands
    .map((c) => c.replaceAll('{{session}}', session))
    .join('; ');

export const checkAlive = async (session: string): Promise<boolean> => {
  const proc = Bun.spawn({
    cmd: ['tmux', '-L', 'luna', 'has-session', '-t', session],
    stdout: 'ignore',
    stderr: 'ignore',
  });
  return (await proc.exited) === 0;
};

export const fetchInfo = async (session: string): Promise<Info | null> => {
  const fmt =
    '#{pane_current_path}\t#{pane_current_command}\t#{session_created}';
  const proc = Bun.spawn({
    cmd: ['tmux', '-L', 'luna', 'display-message', '-p', '-t', session, fmt],
    stdout: 'pipe',
    stderr: 'ignore',
  });
  const code = await proc.exited;
  if (code !== 0) return null;
  const text = await new Response(proc.stdout).text();
  const parts = text.trim().split('\t');
  if (parts.length < 3) return null;
  return {
    session,
    cwd: parts[0]!,
    cmd: parts[1]!,
    created: parseInt(parts[2]!, 10),
  };
};

export const fetchPreview = async (session: string): Promise<Snapshot | null> => {
  const proc = Bun.spawn({
    cmd: ['tmux', '-L', 'luna', 'capture-pane', '-p', '-t', session, '-S', `-${PREVIEW_BUFFER}`],
    stdout: 'pipe',
    stderr: 'ignore',
  });
  const code = await proc.exited;
  if (code !== 0) return null;
  const text = await new Response(proc.stdout).text();
  const lines = text.split('\n');
  while (lines.length > 0 && lines[lines.length - 1]!.trim() === '') lines.pop();
  return { session, lines };
};

export const eqInfo = (a: Info | null, b: Info | null): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.session === b.session &&
    a.cwd === b.cwd &&
    a.cmd === b.cmd &&
    a.created === b.created
  );
};

export const eqSnapshot = (a: Snapshot | null, b: Snapshot | null): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.session !== b.session) return false;
  if (a.lines.length !== b.lines.length) return false;
  for (let i = 0; i < a.lines.length; i++) {
    if (a.lines[i] !== b.lines[i]) return false;
  }
  return true;
};
