import React, { useEffect, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';

import { COLOR, REFRESH_INTERVAL_MS } from './config';
import { pickRandom, sessionId, uniqueName } from './utils';
import {
  buildScript,
  checkAlive,
  eqInfo,
  eqSnapshot,
  fetchInfo,
  fetchPreview,
} from './tmux';
import type { Info, Slot, Snapshot, Status } from './types';

import { Banner } from './components/Banner';
import { SlotRow } from './components/SlotRow';
import { InfoCard } from './components/InfoCard';
import { PreviewPane } from './components/PreviewPane';

export const App: React.FC = () => {
  const { exit } = useApp();
  const [slots, setSlots] = useState<Slot[]>(() =>
    pickRandom(5).map((name) => ({ name, session: sessionId(), status: 'fresh' as Status })),
  );
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [renameInput, setRenameInput] = useState<string | null>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const [preview, setPreview] = useState<Snapshot | null>(null);
  const [digitBuffer, setDigitBuffer] = useState<number | null>(null);
  const [awaitingDigit, setAwaitingDigit] = useState(false);

  const focused = slots[selected]!;
  const cols = process.stdout.columns || 100;
  const rows = process.stdout.rows || 30;
  const paneInnerWidth = Math.max(20, Math.floor((cols - 6) / 2) - 4);
  const previewVisibleLines = Math.max(5, rows - 24);
  const slotListMaxVisible = Math.max(3, rows - 20);

  const slotWindowHalf = Math.floor(slotListMaxVisible / 2);
  let slotStart: number;
  if (slots.length <= slotListMaxVisible) {
    slotStart = 0;
  } else if (selected <= slotWindowHalf) {
    slotStart = 0;
  } else if (selected >= slots.length - (slotListMaxVisible - slotWindowHalf)) {
    slotStart = slots.length - slotListMaxVisible;
  } else {
    slotStart = selected - slotWindowHalf;
  }
  const slotEnd = Math.min(slots.length, slotStart + slotListMaxVisible);
  const slotsAbove = slotStart;
  const slotsBelow = slots.length - slotEnd;

  useEffect(() => {
    if (busy) return;
    if (focused.status !== 'alive') {
      setInfo(null);
      setPreview(null);
      return;
    }
    let mounted = true;
    const refresh = async () => {
      const [i, p] = await Promise.all([
        fetchInfo(focused.session),
        fetchPreview(focused.session),
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
  }, [focused.session, focused.status, busy]);

  useInput((input, key) => {
    if (busy) return;

    if (renameInput !== null) {
      if (key.escape) return setRenameInput(null);
      if (key.return) {
        const trimmed = renameInput.trim();
        if (trimmed) {
          setSlots((ss) =>
            ss.map((s, i) => (i === selected ? { ...s, name: trimmed } : s)),
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

    if (key.ctrl && input === 'c') return exit();

    const digit =
      input.length === 1 && input >= '0' && input <= '9' ? parseInt(input, 10) : null;
    if (digit !== null) {
      const newBuffer =
        awaitingDigit && digitBuffer !== null ? digitBuffer * 10 + digit : digit;
      setDigitBuffer(newBuffer);
      setAwaitingDigit(false);
      if (newBuffer >= 1 && newBuffer <= slots.length) {
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
      setSelected((s) => (s - 1 + slots.length) % slots.length);
      return;
    }
    if (key.downArrow) {
      setSelected((s) => (s + 1) % slots.length);
      return;
    }
    if (input === 'a') {
      const used = new Set(slots.map((s) => s.name));
      const newSlot: Slot = { name: uniqueName(used), session: sessionId(), status: 'fresh' };
      setSlots((ss) => [...ss, newSlot]);
      setSelected(slots.length);
      return;
    }
    if (input === 'r') {
      setRenameInput(slots[selected]!.name);
      return;
    }
    if (key.return) {
      const slot = slots[selected]!;
      setBusy(true);
      setSlots((ss) =>
        ss.map((s) =>
          s.session === slot.session ? { ...s, status: 'alive' as Status } : s,
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
        setSlots((ss) =>
          ss.map((s) =>
            s.session === slot.session
              ? { ...s, status: (alive ? 'alive' : 'dead') as Status }
              : s,
          ),
        );
        setBusy(false);
      })();
    }
  });

  const focusedDot =
    focused.status === 'alive' ? COLOR.alive :
    focused.status === 'dead' ? COLOR.dead :
    COLOR.fresh;

  const currentInfo = info && info.session === focused.session ? info : null;
  const currentPreviewLines =
    preview && preview.session === focused.session ? preview.lines : null;

  return (
    <Box flexDirection="column" width={cols} height={rows} padding={1}>
      <Banner />
      <Box alignSelf="center" marginTop={1}>
        <Text color={COLOR.dim}>
          ↑↓ nav  ·  digits jump (1+2 → 12)  ·  ↵ open  ·  a add  ·  r rename  ·  Esc detach  ·  ⌃C quit
        </Text>
      </Box>
      <Box alignSelf="center" minHeight={1}>
        {digitBuffer !== null ? (
          <>
            <Text color={COLOR.dim}>→ slot </Text>
            <Text color={COLOR.title} bold>{digitBuffer}</Text>
            {awaitingDigit && <Text color={COLOR.title} bold>+</Text>}
          </>
        ) : (
          <Text> </Text>
        )}
      </Box>

      <Box flexDirection="row" flexGrow={1} marginTop={1}>
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={COLOR.border}
          paddingX={2}
          paddingY={1}
          flexGrow={1}
          flexBasis={0}
        >
          {slotsAbove > 0 && (
            <Text color={COLOR.dim}>  ↑ {slotsAbove} more above</Text>
          )}
          {slots.slice(slotStart, slotEnd).map((slot, idx) => {
            const i = slotStart + idx;
            const active = i === selected;
            return (
              <SlotRow
                key={slot.session}
                slot={slot}
                index={i}
                active={active}
                renameValue={active && renameInput !== null ? renameInput : null}
              />
            );
          })}
          {slotsBelow > 0 && (
            <Text color={COLOR.dim}>  ↓ {slotsBelow} more below</Text>
          )}
        </Box>

        <Box flexDirection="column" marginLeft={2} flexGrow={1} flexBasis={0}>
          <InfoCard
            focusedName={focused.name}
            focusedStatus={focused.status}
            dotColor={focusedDot}
            info={currentInfo}
            cwdWidth={paneInnerWidth - 9}
            borderColor={COLOR.border}
          />
          <PreviewPane
            lines={currentPreviewLines}
            visibleLines={previewVisibleLines}
            width={paneInnerWidth}
            status={focused.status}
            borderColor={COLOR.border}
          />
        </Box>
      </Box>
    </Box>
  );
};
