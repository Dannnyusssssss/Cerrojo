/** Sala de prueba del Hito 1: un estudio pequeño con cinco objetos interactuables. */
import type { RoomDef } from '../../game/room';

export const TEST_ROOM: RoomDef = {
  id: 'test-room',
  width: 6,
  depth: 5,
  height: 2.8,
  wallThickness: 0.2,
  spawn: { x: 0, z: 1.4, yaw: 0 },
  furniture: [
    { id: 'desk', kind: 'desk', x: -1.8, z: -2.05, w: 1.4, d: 0.7, h: 0.75 },
    { id: 'table', kind: 'table', x: 1.0, z: 0.2, w: 1.0, d: 0.8, h: 0.72 },
    { id: 'cabinet', kind: 'cabinet', x: 2.65, z: -1.6, w: 0.6, d: 1.0, h: 1.9 },
    { id: 'shelf', kind: 'shelf', x: -2.78, z: 0.8, w: 0.44, d: 1.4, h: 1.8 },
  ],
  interactables: [
    {
      id: 'box',
      nameKey: 'box',
      prop: 'box',
      behavior: 'toggle',
      position: { x: 1.0, y: 0.85, z: 0.2 },
      size: { x: 0.4, y: 0.25, z: 0.3 },
    },
    {
      id: 'book',
      nameKey: 'book',
      prop: 'book',
      behavior: 'examine',
      position: { x: -1.45, y: 0.78, z: -2.0 },
      size: { x: 0.22, y: 0.05, z: 0.3 },
      rotationY: 0.25,
    },
    {
      id: 'drawer',
      nameKey: 'drawer',
      prop: 'drawer',
      behavior: 'toggle',
      position: { x: -2.0, y: 0.6, z: -1.675 },
      size: { x: 0.5, y: 0.16, z: 0.04 },
      openOffset: { x: 0, y: 0, z: 0.32 },
    },
    {
      id: 'clock',
      nameKey: 'clock',
      prop: 'clock',
      behavior: 'examine',
      position: { x: 0, y: 1.85, z: 2.47 },
      size: { x: 0.42, y: 0.42, z: 0.05 },
      rotationY: Math.PI,
    },
    {
      id: 'cabinet-door',
      nameKey: 'cabinet',
      prop: 'cabinetDoor',
      behavior: 'toggle',
      position: { x: 2.325, y: 0.96, z: -1.6 },
      size: { x: 0.04, y: 1.8, z: 0.94 },
      rotationY: -Math.PI / 2,
    },
  ],
};
