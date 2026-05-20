import { SPACE_WORDS } from './config';

const pad = (n: number) => String(n).padStart(2, '0');

export const pickRandom = (n: number): string[] => {
  const shuffled = [...SPACE_WORDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
};

export const uniqueName = (used: Set<string>): string => {
  const available = SPACE_WORDS.filter((n) => !used.has(n));
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)]!;
  }
  let i = 1;
  while (used.has(`session-${i}`)) i++;
  return `session-${i}`;
};

export const sessionId = () =>
  `luna-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const uniqueGroupName = (used: Set<string>): string => {
  let i = 1;
  while (used.has(`Constellation ${i}`)) i++;
  return `Constellation ${i}`;
};

export const formatCreated = (sec: number): string => {
  const d = new Date(sec * 1000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export const shortPath = (p: string, max: number): string => {
  const home = process.env.HOME ?? '';
  const s = home && p.startsWith(home) ? '~' + p.slice(home.length) : p;
  return s.length > max ? '…' + s.slice(-(max - 1)) : s;
};
