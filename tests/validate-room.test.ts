import { describe, expect, it } from 'vitest';
import { ROOM_1 } from '../src/data/rooms/room-1';
import type { InteractableDef, PuzzleDef, RoomDef } from '../src/game/room';
import { validateRoom } from '../src/game/validate-room';

/** Copia de la Sala 1 con cambios, para fabricar salas mal formadas a propósito. */
function variant(
  change: (room: {
    interactables: InteractableDef[];
    puzzles: PuzzleDef[];
    items: RoomDef['items'][number][];
  }) => void,
): RoomDef {
  const interactables = ROOM_1.interactables.map((d) => ({ ...d }));
  const puzzles = ROOM_1.puzzles.map((p) => ({ ...p }));
  const items = ROOM_1.items.map((i) => ({ ...i }));
  change({ interactables, puzzles, items });
  return { ...ROOM_1, interactables, puzzles, items };
}

const find = (list: InteractableDef[], id: string): InteractableDef => {
  const found = list.find((d) => d.id === id);
  if (!found) throw new Error(id);
  return found;
};

describe('validación estática de salas', () => {
  it('la Sala 1 es válida', () => {
    expect(validateRoom(ROOM_1)).toEqual([]);
  });

  it('detecta un ciclo: la llave del armario guardada dentro del armario', () => {
    const room = variant(({ interactables }) => {
      find(interactables, 'small-key').insideOf = 'cabinet-door';
    });
    expect(validateRoom(room).some((e) => e.startsWith('ciclo'))).toBe(true);
  });

  it('detecta un objeto sin uso', () => {
    const room = variant(({ items }) => {
      items.push({ id: 'paraguas', nameKey: 'book', icon: 'block' });
    });
    expect(validateRoom(room)).toContain('objeto sin uso: paraguas');
  });

  it('detecta un objeto necesario que no se puede conseguir', () => {
    const room = variant(({ interactables }) => {
      const index = interactables.findIndex((d) => d.id === 'door-key');
      interactables.splice(index, 1);
    });
    expect(validateRoom(room).some((e) => e.includes('door-key no se puede conseguir'))).toBe(true);
  });

  it('detecta una pista que solo aparece después del puzzle que la necesita', () => {
    const room = variant(({ interactables }) => {
      // La tarjeta de orden aparecería al abrir el cofre que necesita esa misma tarjeta.
      const card = find(interactables, 'order-card');
      delete card.revealedBy;
      card.insideOf = 'chest';
    });
    expect(validateRoom(room).length).toBeGreaterThan(0);
  });

  it('detecta una salida inalcanzable', () => {
    const room = variant(({ puzzles }) => {
      const index = puzzles.findIndex((p) => p.id === 'p-exit');
      puzzles.splice(index, 1);
    });
    expect(validateRoom(room)).toContain('la sala debe tener exactamente una salida (tiene 0)');
  });

  it('detecta referencias rotas e identificadores duplicados', () => {
    const room = variant(({ interactables }) => {
      find(interactables, 'book').insideOf = 'no-existe';
      interactables.push({ ...find(interactables, 'clock') });
    });
    const errors = validateRoom(room);
    expect(errors).toContain('objeto duplicado: clock');
    expect(errors.some((e) => e.includes('contenedor inexistente'))).toBe(true);
  });

  it('detecta una pista que no está en la sala', () => {
    const room = variant(({ interactables }) => {
      delete find(interactables, 'postcard').clue;
    });
    expect(validateRoom(room).some((e) => e.includes('clue-square'))).toBe(true);
  });
});
