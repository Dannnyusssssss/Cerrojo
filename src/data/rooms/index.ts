/** Las salas del juego, en el orden en que se desbloquean. */
import type { RoomDef } from '../../game/room';
import { ROOM_1 } from './room-1';
import { ROOM_2 } from './room-2';
import { ROOM_3 } from './room-3';

export const ROOMS: readonly RoomDef[] = [ROOM_1, ROOM_2, ROOM_3];
