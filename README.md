# 🌙 luna

```
██╗     ██╗   ██╗███╗   ██╗ █████╗
██║     ██║   ██║████╗  ██║██╔══██╗
██║     ██║   ██║██╔██╗ ██║███████║
██║     ██║   ██║██║╚██╗██║██╔══██║
███████╗╚██████╔╝██║ ╚████║██║  ██║
╚══════╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝
```

A purple-themed terminal multiplexer launcher. Each "slot" is a persistent
tmux session that you can pop into in a floating window and detach from
without losing state. The slot list lives on the left; a live info card + a
sliding-window preview of the most recent output lives on the right.

Built on **Bun + React + Ink + tmux**.

## Requirements

- **bash** + **tmux** (3.2+ recommended, for `display-popup`)
- **Bun** (≥ 1.0)
- A terminal. Runs best on native Linux/macOS. Inside WSL it works
  functionally but Ink's render diff can flicker on top of WSL's pty layer —
  see the troubleshooting section below.

## Run

```bash
bun install
bun start                # wraps the app in an outer tmux session
# or
bun run src/index.tsx    # raw, no outer tmux wrapper
```

`bun start` calls `bin/start.sh`, which spawns/attaches a tmux session named
`luna` and boots the Ink app inside it. The outer tmux is what makes
`tmux display-popup` work for slot popups.

## Controls

| Key | Action |
| --- | --- |
| `↑` `↓` | Navigate slot list |
| `1`–`9` | Jump to slot 1–9 |
| `1` `+` `2` (etc.) | Multi-digit jump — `+` extends the current number, e.g. `1+8+0` jumps to slot 180 |
| `↵` | Open the focused slot's session in a floating popup |
| `a` | Add a new slot |
| `r` | Rename the focused slot (type new name, `↵` to apply, `Esc` to cancel) |
| `Esc` *(inside popup)* | Detach from session — popup closes, session persists |
| `exit` / `⌃D` *(inside popup)* | Destroy the session (slot turns red) |
| `⌃C` | Quit luna |

## Slot status

Each slot row has a colored dot:

- ⚪ **grey** — `fresh`, never opened
- 🟢 **green** — `alive`, session running and reattachable
- 🔴 **red** — `dead`, session was destroyed (you `exit`-ed instead of detaching)

To get fresh state on a dead slot, just hit `↵` again — luna creates a new
session on the slot's stable id and the status returns to alive.

## Project layout

```
src/
  index.tsx          entry point — renders <App />
  App.tsx            main component, input handling, layout
  config.ts          colors, banner, name pool, polling intervals
  types.ts           shared types (Slot, Status, Info, Snapshot)
  tmux.ts            tmux subprocess helpers + dedup comparators
  utils.ts           formatting, random name generation
  components/
    Banner.tsx       memoized ASCII logo
    SlotRow.tsx      memoized single slot row
    InfoCard.tsx     memoized right-pane info section
    PreviewPane.tsx  memoized live preview of the focused session
tmux-commands.json   tmux command templates with {{session}} placeholders
bin/start.sh         launcher that wraps luna in an outer tmux session
```

Everything renders inside the dynamic area; `Banner` is memoized so it
doesn't participate in re-renders. `SlotRow`, `InfoCard`, and `PreviewPane`
are memoized with referentially stable props so Ink's per-row diff stays
minimal.

## Customizing tmux behavior

All tmux commands live in **`tmux-commands.json`**. Each entry is a shell
command run by luna when opening a slot. Use `{{session}}` as the slot's
stable session id placeholder. The default file:

```json
{
  "commands": [
    "tmux -L luna has-session -t {{session}} 2>/dev/null || tmux -L luna set-option -g history-limit 50000 \\; new-session -d -s {{session}} \\; set-option status off",
    "tmux -L luna set-option -g status off",
    "tmux -L luna set-option -g escape-time 10",
    "tmux -L luna bind-key -T root Escape detach-client",
    "tmux display-popup -w 95% -h 80% -E 'TMUX= tmux -L luna attach -t {{session}}'"
  ]
}
```

Notes:

- The `-L luna` socket isolates luna's tmux state from your default tmux
  server. Sessions show up only via `tmux -L luna ls`.
- `history-limit 50000` is set **before** session creation because tmux only
  applies the limit to new windows.
- The `escape-time 10` + `bind-key -T root Escape detach-client` combo means
  pressing `Esc` inside a popup detaches you (session persists). Without
  this, you'd need the prefix-prefix trick.

Tweak this file freely — bump popup geometry, change keybindings, add more
setup commands. Restart luna for changes to take effect.

## Troubleshooting

### Flicker on WSL

Ink does clear-and-redraw of the dynamic area on every state change. On
native Linux/macOS this is fast enough to look smooth; on WSL the
escape-sequence path through `WSL pty → Windows Terminal` adds latency that
makes the redraws visible.

Mitigations, lightest to heaviest:

1. **Different terminal emulator** — WezTerm and Alacritty handle escape
   sequences much better than Windows Terminal for full-screen TUIs.
2. **SSH from native Windows into WSL** — bypasses the WSL pty rendering
   pipeline. Set up `openssh-server` in WSL, then from PowerShell:
   `ssh -t -i ~/.ssh/wsl_key wsluser@localhost "cd /path/to/luna && bun start"`.
3. **Run on native Linux/macOS** — no Ink-on-WSL friction at all.

### Sessions don't persist between luna runs

By default, luna generates a fresh `session` id per slot on every launch,
so previous sessions on the `luna` tmux socket are orphaned. They still
exist (try `tmux -L luna ls`) but aren't tied to any slot in the current
luna run. If you want cross-run persistence, persist the slot list to disk
and reuse session ids on next launch.

### Buffer cuts off when scrolling-by-tail

luna shows the **last N lines** of each session's tmux buffer (sliding
window — older lines disappear off the top as new ones arrive). To see
older history, open the popup and use tmux's copy mode: `Ctrl+B [`, then
arrow keys or `Page Up`. luna doesn't intercept scroll keys to keep the
input model simple.

## License

MIT.
