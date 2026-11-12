import { describe, expect, it } from 'vitest';
import { TEST_ROOM } from '../src/data/rooms/test-room';
import { TEXTS } from '../src/data/texts';
import { aabbIntersects, interactableBox, roomOccluders } from '../src/game/room';

describe('validación estática de la sala de prueba', () => {
  const occluders = roomOccluders(TEST_ROOM);

  it('los identificadores son únicos', () => {
    const ids = [
      ...TEST_ROOM.furniture.map((f) => f.id),
      ...TEST_ROOM.interactables.map((i) => i.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tiene entre 4 y 5 objetos interactuables con nombre visible', () => {
    expect(TEST_ROOM.interactables.length).toBeGreaterThanOrEqual(4);
    expect(TEST_ROOM.interactables.length).toBeLessThanOrEqual(5);
    for (const item of TEST_ROOM.interactables) {
      expect(TEXTS.objects[item.nameKey].length).toBeGreaterThan(0);
    }
  });

  it('ningún objeto queda dentro de una pared o un mueble, abierto o cerrado', () => {
    for (const item of TEST_ROOM.interactables) {
      for (const open of [false, true]) {
        const box = interactableBox(item, open);
        for (const occluder of occluders) {
          expect(aabbIntersects(box, occluder), `${item.id} abierto=${open}`).toBe(false);
        }
      }
    }
  });

  it('los muebles quedan dentro de la sala', () => {
    const hw = TEST_ROOM.width / 2;
    const hd = TEST_ROOM.depth / 2;
    for (const f of TEST_ROOM.furniture) {
      expect(f.x - f.w / 2).toBeGreaterThanOrEqual(-hw);
      expect(f.x + f.w / 2).toBeLessThanOrEqual(hw);
      expect(f.z - f.d / 2).toBeGreaterThanOrEqual(-hd);
      expect(f.z + f.d / 2).toBeLessThanOrEqual(hd);
      expect(f.h).toBeLessThan(TEST_ROOM.height);
    }
  });
});
