import React, { useEffect, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';

import { COLOR, REFRESH_INTERVAL_MS } from './config';
import { pickRandom, sessionId, uniqueGroupName, uniqueName } from './utils';
import {
  buildScript,
  checkAlive,
  eqInfo,
  eqSnapshot,
  fetchInfo,
  fetchPreview,
} from './tmux';
import {
  addSlotAt,
  collapseAll,
  collectGroupNames,
  collectSlotNames,
  findFlatIndex,
  flatten,
  moveDown,
  moveUp,
  removeAtPath,
  setAtPath,
} from './tree';
import type { Group, Info, Item, Path, Slot, Snapshot, Status } from './types';

import { Banner } from './components/Banner';
import { SlotRow } from './components/SlotRow';
import { GroupRow } from './components/GroupRow';
import { InfoCard } from './components/InfoCard';
import { PreviewPane } from './components/PreviewPane';

export const App: React.FC = () => {
  const { exit } = useApp();
  const [items, setItems] = useState<Item[]>(() =>
    pickRandom(3).map((name) => ({
      kind: 'slot' as const,
      name,
      session: sessionId(),
      status: 'fresh' as Status,
    })),
  );
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [renameInput, setRenameInput] = useState<string | null>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const [preview, setPreview] = useState<Snapshot | null>(null);
  const [digitBuffer, setDigitBuffer] = useState<number | null>(null);
  const [awaitingDigit, setAwaitingDigit] = useState(false);
  const [moveMode, setMoveMode] = useState(false);

  const flat = flatten(items);
  const focusedEntry = flat[Math.min(selected, flat.length - 1)] ?? flat[0]!;
  const focusedPath = focusedEntry.path;
  const focusedSlot = focusedEntry.kind === 'slot' ? focusedEntry.slot : null;

  const cols = process.stdout.columns || 100;
  const rows = process.stdout.rows;
  const paneInnerWidth = Math.max(20, Math.floor((cols - 6) / 2) - 4);
  const previewVisibleLines = Math.max(5, rows - 24);
  const slotListMaxVisible = Math.max(3, rows - 14);

  const slotWindowHalf = Math.floor(slotListMaxVisible / 2);
  let slotStart: number;
  if (flat.length <= slotListMaxVisible) {
    slotStart = 0;
  } else if (selected <= slotWindowHalf) {
    slotStart = 0;
  } else if (selected >= flat.length - (slotListMaxVisible - slotWindowHalf)) {
    slotStart = flat.length - slotListMaxVisible;
  } else {
    slotStart = selected - slotWindowHalf;
  }
  const slotEnd = Math.min(flat.length, slotStart + slotListMaxVisible);
  const slotsAbove = slotStart;
  const slotsBelow = flat.length - slotEnd;

  useEffect(() => {
    if (busy) return;
    if (!focusedSlot || focusedSlot.status !== 'alive') {
      setInfo(null);
      setPreview(null);
      return;
    }
    let mounted = true;
    const refresh = async () => {
      const [i, p] = await Promise.all([
        fetchInfo(focusedSlot.session),
        fetchPreview(focusedSlot.session),
      ]);
      if (!mounted) return;
      setInfo((prev) => (eqInfo(prev, i) ? prev : i));
      setPreview((prev) => (eqSnapshot(prev, p) ? prev : p));
    };
    refresh();
    const id = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [focusedSlot?.session, focusedSlot?.status, busy]);

  const applyMove = (
    mover: (items: Item[], path: Path) => { items: Item[]; path: Path } | null,
  ) => {
    const result = mover(items, focusedPath);
    if (!result) return;
    setItems(result.items);
    const newFlat = flatten(result.items);
    const newIdx = findFlatIndex(newFlat, result.path);
    if (newIdx >= 0) setSelected(newIdx);
  };

  useInput((input, key) => {
    if (busy) return;

    if (renameInput !== null) {
      if (key.escape) return setRenameInput(null);
      if (key.return) {
        const trimmed = renameInput.trim();
        if (trimmed) {
          setItems((curr) =>
            setAtPath(curr, focusedPath, (it) => ({ ...it, name: trimmed })),
          );
        }
        setRenameInput(null);
        return;
      }
      if (key.backspace || key.delete) {
        setRenameInput((s) => (s ?? '').slice(0, -1));
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setRenameInput((s) => (s ?? '') + input);
      }
      return;
    }

    if (key.ctrl && input === 'd') {
      Bun.spawn({
        cmd: ['tmux', 'detach-client'],
        stdout: 'ignore',
        stderr: 'ignore',
      });
      return;
    }
    if (key.ctrl && input === 'c') return exit();
    if (input === 'G' || input === 'z' || input === '-') {
      setItems((curr) => collapseAll(curr));
      return;
    }

    if (moveMode) {
      if (key.upArrow) return applyMove(moveUp);
      if (key.downArrow) return applyMove(moveDown);
      if (key.escape || key.return || input === 'm') {
        setMoveMode(false);
        return;
      }
      return;
    }

    const digit =
      input.length === 1 && input >= '0' && input <= '9' ? parseInt(input, 10) : null;
    if (digit !== null) {
      const newBuffer =
        awaitingDigit && digitBuffer !== null ? digitBuffer * 10 + digit : digit;
      setDigitBuffer(newBuffer);
      setAwaitingDigit(false);
      if (newBuffer >= 1 && newBuffer <= flat.length) {
        setSelected(newBuffer - 1);
      }
      return;
    }
    if (input === '+' && digitBuffer !== null) {
      setAwaitingDigit(true);
      return;
    }
    if (digitBuffer !== null || awaitingDigit) {
      setDigitBuffer(null);
      setAwaitingDigit(false);
    }

    if (key.upArrow) {
      setSelected((s) => (s - 1 + flat.length) % flat.length);
      return;
    }
    if (key.downArrow) {
      setSelected((s) => (s + 1) % flat.length);
      return;
    }
    if (input === 'a') {
      const used = new Set(collectSlotNames(items));
      const newSlot: Slot = {
        kind: 'slot',
        name: uniqueName(used),
        session: sessionId(),
        status: 'fresh',
      };
      const result = addSlotAt(items, focusedPath, newSlot);
      setItems(result.items);
      const newFlat = flatten(result.items);
      const newIdx = findFlatIndex(newFlat, result.path);
      if (newIdx >= 0) setSelected(newIdx);
      return;
    }
    if (input === 'g') {
      const used = new Set(collectGroupNames(items));
      const newGroup: Group = {
        kind: 'group',
        name: uniqueGroupName(used),
        collapsed: false,
        children: [],
      };
      const newItems = [...items, newGroup];
      setItems(newItems);
      setSelected(flatten(newItems).length - 1);
      return;
    }
    if (input === 'r') {
      const name =
        focusedEntry.kind === 'slot'
          ? focusedEntry.slot.name
          : focusedEntry.group.name;
      setRenameInput(name);
      return;
    }
    if (input === 'm') {
      setMoveMode(true);
      return;
    }
    if (input === 'x') {
      if (flat.length <= 1) return;
      if (focusedEntry.kind === 'slot') {
        Bun.spawn({
          cmd: ['tmux', '-L', 'luna', 'kill-session', '-t', focusedEntry.slot.session],
          stdout: 'ignore',
          stderr: 'ignore',
        });
        const newItems = removeAtPath(items, focusedPath);
        setItems(newItems);
        const newFlat = flatten(newItems);
        setSelected(Math.min(selected, newFlat.length - 1));
      } else if (focusedEntry.group.children.length === 0) {
        const newItems = removeAtPath(items, focusedPath);
        setItems(newItems);
        const newFlat = flatten(newItems);
        setSelected(Math.min(selected, newFlat.length - 1));
      }
      return;
    }
    if (key.return) {
      if (focusedEntry.kind === 'group') {
        setItems((curr) =>
          setAtPath(curr, focusedPath, (it) =>
            it.kind === 'group' ? { ...it, collapsed: !it.collapsed } : it,
          ),
        );
        return;
      }
      const slot = focusedEntry.slot;
      setBusy(true);
      setItems((curr) =>
        setAtPath(curr, focusedPath, (it) =>
          it.kind === 'slot' ? { ...it, status: 'alive' as Status } : it,
        ),
      );
      (async () => {
        const proc = Bun.spawn({
          cmd: ['bash', '-c', buildScript(slot.session)],
          stdio: ['inherit', 'inherit', 'inherit'],
          env: process.env as Record<string, string>,
        });
        await proc.exited;
        const alive = await checkAlive(slot.session);
        setItems((curr) =>
          setAtPath(curr, focusedPath, (it) =>
            it.kind === 'slot'
              ? { ...it, status: (alive ? 'alive' : 'dead') as Status }
              : it,
          ),
        );
        setBusy(false);
      })();
    }
  });

  const focusedDot = focusedSlot
    ? focusedSlot.status === 'alive'
      ? COLOR.alive
      : focusedSlot.status === 'dead'
        ? COLOR.dead
        : COLOR.fresh
    : COLOR.dim;

  const currentInfo =
    focusedSlot && info && info.session === focusedSlot.session ? info : null;
  const currentPreviewLines =
    focusedSlot && preview && preview.session === focusedSlot.session
      ? preview.lines
      : null;

  return (
    <Box flexDirection="column" width={cols} height={rows} padding={1}>
      <Banner />
      <Box alignSelf="center" marginTop={1}>
        <Text color={COLOR.dim}>
          ↑↓ nav  ·  digits jump  ·  ↵ open/collapse  ·  a add  ·  g group  ·  z collapse all  ·  m move  ·  r rename  ·  x delete  ·  ⌃D detach  ·  ⌃C quit
        </Text>
      </Box>
      <Box alignSelf="center" minHeight={1}>
        {moveMode ? (
          <Text color={COLOR.title} bold>↕ MOVE MODE — ↑↓ to reorder, Esc/m to exit</Text>
        ) : digitBuffer !== null ? (
          <>
            <Text color={COLOR.dim}>→ slot </Text>
            <Text color={COLOR.title} bold>{digitBuffer}</Text>
            {awaitingDigit && <Text color={COLOR.title} bold>+</Text>}
          </>
        ) : (
          <Text> </Text>
        )}
      </Box>

      <Box flexDirection="row" flexGrow={1}>
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={COLOR.border}
          paddingX={2}
          paddingTop={1}
          flexGrow={1}
          flexBasis={0}
        >
          {slotsAbove > 0 && (
            <Text color={COLOR.dim}>  ↑ {slotsAbove} more above</Text>
          )}
          {flat.slice(slotStart, slotEnd).map((entry, idx) => {
            const i = slotStart + idx;
            const active = i === selected;
            const rv = active && renameInput !== null ? renameInput : null;
            if (entry.kind === 'group') {
              return (
                <GroupRow
                  key={`g-${entry.path[0]}`}
                  group={entry.group}
                  index={i}
                  active={active}
                  moveMode={active && moveMode}
                  renameValue={rv}
                />
              );
            }
            return (
              <SlotRow
                key={entry.slot.session}
                slot={entry.slot}
                index={i}
                active={active}
                indent={entry.indent}
                moveMode={active && moveMode}
                renameValue={rv}
              />
            );
          })}
          {slotsBelow > 0 && (
            <Text color={COLOR.dim}>  ↓ {slotsBelow} more below</Text>
          )}
        </Box>

        <Box flexDirection="column" marginLeft={2} flexGrow={1} flexBasis={0}>
          {focusedEntry.kind === 'group' ? (
            <Box
              flexDirection="column"
              borderStyle="round"
              borderColor={COLOR.border}
              paddingX={2}
              height={7}
              flexShrink={0}
              overflow="hidden"
            >
              <Box>
                <Text color={COLOR.title} bold wrap="truncate">{focusedEntry.group.name}</Text>
                <Text color={COLOR.dim}>  </Text>
                <Text color={COLOR.title}>(group)</Text>
              </Box>
              <Box flexDirection="column" marginTop={1}>
                <Box>
                  <Text color={COLOR.dim}>members  </Text>
                  <Text>{focusedEntry.group.children.length}</Text>
                </Box>
                <Box>
                  <Text color={COLOR.dim}>state    </Text>
                  <Text>{focusedEntry.group.collapsed ? 'collapsed' : 'expanded'}</Text>
                </Box>
                <Box>
                  <Text color={COLOR.dim}>hint     </Text>
                  <Text color={COLOR.dim} wrap="truncate">↵ toggle · r rename · m move</Text>
                </Box>
              </Box>
            </Box>
          ) : (
            <InfoCard
              focusedName={focusedSlot!.name}
              focusedStatus={focusedSlot!.status}
              dotColor={focusedDot}
              info={currentInfo}
              cwdWidth={paneInnerWidth - 9}
              borderColor={COLOR.border}
            />
          )}
          <PreviewPane
            lines={focusedEntry.kind === 'slot' ? currentPreviewLines : null}
            visibleLines={previewVisibleLines}
            width={paneInnerWidth}
            status={focusedSlot?.status ?? 'fresh'}
            borderColor={COLOR.border}
          />
        </Box>
      </Box>
    </Box>
  );
};
