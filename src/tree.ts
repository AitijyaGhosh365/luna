import type { Group, Item, Path, Slot } from './types';

export type FlatEntry =
  | { kind: 'slot'; slot: Slot; path: Path; indent: number }
  | { kind: 'group'; group: Group; path: Path; indent: number };

export const flatten = (items: Item[]): FlatEntry[] => {
  const out: FlatEntry[] = [];
  items.forEach((item, i) => {
    if (item.kind === 'group') {
      out.push({ kind: 'group', group: item, path: [i], indent: 0 });
      if (!item.collapsed) {
        item.children.forEach((child, j) => {
          out.push({ kind: 'slot', slot: child, path: [i, j], indent: 1 });
        });
      }
    } else {
      out.push({ kind: 'slot', slot: item, path: [i], indent: 0 });
    }
  });
  return out;
};

export const getAtPath = (items: Item[], path: Path): Item | null => {
  if (path.length === 1) return items[path[0]] ?? null;
  const group = items[path[0]];
  if (group?.kind !== 'group') return null;
  return group.children[path[1]] ?? null;
};

export const setAtPath = (
  items: Item[],
  path: Path,
  updater: (it: Item) => Item,
): Item[] => {
  if (path.length === 1) {
    return items.map((it, i) => (i === path[0] ? updater(it) : it));
  }
  const [g, c] = path;
  return items.map((it, i) => {
    if (i !== g || it.kind !== 'group') return it;
    return {
      ...it,
      children: it.children.map((ch, j) => (j === c ? (updater(ch) as Slot) : ch)),
    };
  });
};

export const findFlatIndex = (flat: FlatEntry[], target: Path): number =>
  flat.findIndex((e) =>
    e.path.length === target.length &&
    e.path[0] === target[0] &&
    (e.path.length === 1 || e.path[1] === target[1]),
  );

export const addSlotAt = (
  items: Item[],
  path: Path,
  slot: Slot,
): { items: Item[]; path: Path } => {
  const current = getAtPath(items, path);
  if (!current) {
    return { items: [...items, slot], path: [items.length] };
  }

  // pressing 'a' on a group → add into the group as last child
  if (path.length === 1 && current.kind === 'group') {
    const newItems = [...items];
    newItems[path[0]] = { ...current, children: [...current.children, slot] };
    return { items: newItems, path: [path[0], current.children.length] };
  }

  // top-level slot → add as next top-level sibling
  if (path.length === 1) {
    const newItems = [...items];
    newItems.splice(path[0] + 1, 0, slot);
    return { items: newItems, path: [path[0] + 1] };
  }

  // child of group → add as next child in same group
  const [g, c] = path;
  const group = items[g] as Group;
  const newChildren = [...group.children];
  newChildren.splice(c + 1, 0, slot);
  const newItems = [...items];
  newItems[g] = { ...group, children: newChildren };
  return { items: newItems, path: [g, c + 1] };
};

export const collapseAll = (items: Item[]): Item[] =>
  items.map((it) => (it.kind === 'group' ? { ...it, collapsed: true } : it));

export const removeAtPath = (items: Item[], path: Path): Item[] => {
  if (path.length === 1) {
    return items.filter((_, i) => i !== path[0]);
  }
  const [g, c] = path;
  return items.map((it, i) => {
    if (i !== g || it.kind !== 'group') return it;
    return { ...it, children: it.children.filter((_, j) => j !== c) };
  });
};

const swap = <T>(arr: T[], i: number, j: number): T[] => {
  const out = [...arr];
  [out[i], out[j]] = [out[j]!, out[i]!];
  return out;
};

export const moveDown = (
  items: Item[],
  path: Path,
): { items: Item[]; path: Path } | null => {
  const current = getAtPath(items, path);
  if (!current) return null;

  if (path.length === 1) {
    const i = path[0];
    const next = items[i + 1];
    if (!next) return null;

    // group can only swap with adjacent top-level item
    if (current.kind === 'group') {
      return { items: swap(items, i, i + 1), path: [i + 1] };
    }

    // top-level slot moving into an expanded group → first child
    if (next.kind === 'group' && !next.collapsed) {
      const newItems = items.filter((_, idx) => idx !== i);
      const groupIdx = i;
      const grp = newItems[groupIdx] as Group;
      newItems[groupIdx] = { ...grp, children: [current, ...grp.children] };
      return { items: newItems, path: [groupIdx, 0] };
    }

    // simple top-level swap (next is slot or collapsed group)
    return { items: swap(items, i, i + 1), path: [i + 1] };
  }

  // path is [g, c] — slot inside a group
  const [g, c] = path;
  const group = items[g] as Group;
  if (c < group.children.length - 1) {
    const newChildren = swap(group.children, c, c + 1);
    const newItems = [...items];
    newItems[g] = { ...group, children: newChildren };
    return { items: newItems, path: [g, c + 1] };
  }

  // last child — eject after the group at top level
  const slot = group.children[c]!;
  const newItems = [...items];
  newItems[g] = { ...group, children: group.children.slice(0, c) };
  newItems.splice(g + 1, 0, slot);
  return { items: newItems, path: [g + 1] };
};

export const moveUp = (
  items: Item[],
  path: Path,
): { items: Item[]; path: Path } | null => {
  const current = getAtPath(items, path);
  if (!current) return null;

  if (path.length === 1) {
    const i = path[0];
    if (i === 0) return null;
    const prev = items[i - 1];

    if (current.kind === 'group') {
      return { items: swap(items, i, i - 1), path: [i - 1] };
    }

    // top-level slot moving into an expanded group above → last child
    if (prev.kind === 'group' && !prev.collapsed) {
      const newItems = items.filter((_, idx) => idx !== i);
      const groupIdx = i - 1;
      const grp = newItems[groupIdx] as Group;
      const childIdx = grp.children.length;
      newItems[groupIdx] = { ...grp, children: [...grp.children, current] };
      return { items: newItems, path: [groupIdx, childIdx] };
    }

    return { items: swap(items, i, i - 1), path: [i - 1] };
  }

  // child of group
  const [g, c] = path;
  const group = items[g] as Group;
  if (c > 0) {
    const newChildren = swap(group.children, c, c - 1);
    const newItems = [...items];
    newItems[g] = { ...group, children: newChildren };
    return { items: newItems, path: [g, c - 1] };
  }

  // first child — eject before the group at top level
  const slot = group.children[c]!;
  const newItems = [...items];
  newItems[g] = { ...group, children: group.children.slice(1) };
  newItems.splice(g, 0, slot);
  return { items: newItems, path: [g] };
};

export const collectSlotNames = (items: Item[]): string[] => {
  const out: string[] = [];
  for (const item of items) {
    if (item.kind === 'slot') out.push(item.name);
    else item.children.forEach((c) => out.push(c.name));
  }
  return out;
};

export const collectGroupNames = (items: Item[]): string[] =>
  items.flatMap((it) => (it.kind === 'group' ? [it.name] : []));
