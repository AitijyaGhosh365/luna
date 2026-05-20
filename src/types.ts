export type Status = 'fresh' | 'alive' | 'dead';

export type Slot = {
  name: string;
  session: string;
  status: Status;
};

export type Info = {
  session: string;
  cwd: string;
  cmd: string;
  created: number;
};

export type Snapshot = {
  session: string;
  lines: string[];
};
