/**
 * Pantalla de selección de sala: cada sala con su estado (bloqueada o abierta) y sus dos marcas.
 * Una sala bloqueada se muestra con texto (no solo atenuada) y su botón no se puede pulsar.
 */
import { LOOP } from '../data/config';
import { TEXTS } from '../data/texts';
import { isRoomUnlocked, type Records } from '../game/progress';
import type { RoomDef } from '../game/room';
import { formatTime } from '../game/timer';
import { button, el } from './dom';

export interface RoomEntry {
  name: string;
  unlocked: boolean;
  /** Texto de las marcas o del bloqueo. */
  detail: string;
}

function timeOrDash(steps: number | null): string {
  return steps === null ? TEXTS.roomSelect.noRecord : formatTime(steps, LOOP.stepSeconds);
}

/** Datos de cada sala para la pantalla (puro). Con ayudas de depuración, todas abiertas. */
export function roomEntries(
  rooms: readonly RoomDef[],
  records: Records,
  allOpen: boolean,
): RoomEntry[] {
  return rooms.map((room, index) => {
    const unlocked = allOpen || isRoomUnlocked(rooms, index, records);
    const record = records.get(room.id);
    const detail = unlocked
      ? TEXTS.roomSelect.records(
          timeOrDash(record?.clean ?? null),
          timeOrDash(record?.hinted ?? null),
        )
      : TEXTS.roomSelect.locked;
    return { name: TEXTS.rooms[room.titleKey].name, unlocked, detail };
  });
}

export class RoomSelect {
  readonly root: HTMLElement;
  private readonly list: HTMLDivElement;
  private readonly onChoose: (index: number) => void;

  constructor(onChoose: (index: number) => void, onBack: () => void) {
    this.onChoose = onChoose;
    this.list = el('div', { className: 'room-list' });
    this.root = el(
      'section',
      { className: 'screen screen-rooms', attrs: { 'aria-label': TEXTS.roomSelect.title } },
      [
        el('h2', { className: 'screen-title', text: TEXTS.roomSelect.title }),
        this.list,
        el('div', { className: 'menu-buttons' }, [button(TEXTS.roomSelect.back, onBack)]),
      ],
    );
  }

  update(entries: readonly RoomEntry[]): void {
    this.list.replaceChildren(
      ...entries.map((entry, index) => {
        const b = el(
          'button',
          {
            className: entry.unlocked ? 'btn room-btn' : 'btn room-btn room-locked',
            attrs: { type: 'button' },
          },
          [
            el('span', { className: 'room-name', text: `${index + 1}. ${entry.name}` }),
            el('span', { className: 'room-detail', text: entry.detail }),
          ],
        );
        b.disabled = !entry.unlocked;
        b.addEventListener('click', () => {
          this.onChoose(index);
        });
        return b;
      }),
    );
  }
}
