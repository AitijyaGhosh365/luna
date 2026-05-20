export type Status = 'fresh' | 'alive' | 'dead';

export type Slot = {
  kind: 'slot';
  name: string;
  session: string;
  status: Status;
};

export type Group = {
  kind: 'group';
  name: string;
  collapsed: boolean;
  children: Slot[];
};

export type Item = Slot | Group;

// [topIndex] for top-level item, [topIndex, childIndex] for slot inside a group
export type Path = [number] | [number, number];

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
