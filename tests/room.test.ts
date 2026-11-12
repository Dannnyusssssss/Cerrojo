import { describe, expect, it } from 'vitest';
import { PLAYER } from '../src/data/config';
import { ROOM_1 } from '../src/data/rooms/room-1';
import { TEXTS } from '../src/data/texts';
import { circleOverlapsAny } from '../src/game/collision';
import { aabbIntersects, interactableBox, roomColliders, roomOccluders } from '../src/game/room';
import { validateRoom } from '../src/game/validate-room';

describe('Sala 1: validación estática', () => {
  const occluders = roomOccluders(ROOM_1);

  it('pasa la validación de solución garantizada', () => {
    expect(validateRoom(ROOM_1)).toEqual([]);
  });

  it('todos los objetos y puzzles tienen nombre visible', () => {
    for (const item of ROOM_1.interactables)
      expect(TEXTS.objects[item.nameKey].length).toBeGreaterThan(0);
    for (const item of ROOM_1.items) expect(TEXTS.objects[item.nameKey].length).toBeGreaterThan(0);
  });

  it('tiene entre 4 y 5 puzzles y usa code-lock, key-lock y placement', () => {
    expect(ROOM_1.puzzles.length).toBeGreaterThanOrEqual(4);
    expect(ROOM_1.puzzles.length).toBeLessThanOrEqual(5);
    expect(new Set(ROOM_1.puzzles.map((p) => p.type))).toEqual(
      new Set(['code-lock', 'key-lock', 'placement']),
    );
  });

  it('ningún objeto queda dentro de una pared o un mueble, abierto o cerrado', () => {
    for (const item of ROOM_1.interactables) {
      for (const open of [false, true]) {
        const box = interactableBox(item, open);
        for (const occluder of occluders) {
          expect(aabbIntersects(box, occluder), `${item.id} abierto=${open}`).toBe(false);
        }
      }
    }
  });

  it('los muebles quedan dentro de la sala', () => {
    const hw = ROOM_1.width / 2;
    const hd = ROOM_1.depth / 2;
    for (const f of ROOM_1.furniture) {
      expect(f.x - f.w / 2).toBeGreaterThanOrEqual(-hw);
      expect(f.x + f.w / 2).toBeLessThanOrEqual(hw);
      expect(f.z - f.d / 2).toBeGreaterThanOrEqual(-hd);
      expect(f.z + f.d / 2).toBeLessThanOrEqual(hd);
      expect(f.h).toBeLessThan(ROOM_1.height);
    }
  });

  it('cada punto de acceso es un lugar donde el jugador cabe', () => {
    const colliders = roomColliders(ROOM_1);
    for (const item of ROOM_1.interactables) {
      expect(circleOverlapsAny(item.approach, PLAYER.radius, colliders), item.id).toBe(false);
    }
  });
});
