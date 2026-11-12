import { describe, expect, it } from 'vitest';
import { ROOM_1 } from '../src/data/rooms/room-1';
import { TEXTS } from '../src/data/texts';
import { GameState } from '../src/game/game-state';
import { generateAnswers } from '../src/game/seeded';
import { focusTexts, outcomeMessage, piecesInInventory } from '../src/ui/feedback';

const items = ROOM_1.items;
const newGame = (): GameState => new GameState(ROOM_1, generateAnswers(ROOM_1, 3));

describe('mensajes de respuesta', () => {
  it('cada error tiene un mensaje visible', () => {
    expect(outcomeMessage({ kind: 'locked', id: 'cabinet-door' }, items)).toBe(
      TEXTS.messages.locked,
    );
    expect(outcomeMessage({ kind: 'wrongItem', item: 'small-key' }, items)).toBe(
      TEXTS.messages.wrongItem,
    );
    expect(outcomeMessage({ kind: 'inventoryFull' }, items)).toBe(TEXTS.messages.inventoryFull);
  });

  it('recoger nombra el objeto', () => {
    expect(outcomeMessage({ kind: 'picked', id: 'small-key', item: 'small-key' }, items)).toBe(
      TEXTS.messages.picked(TEXTS.objects.smallKey),
    );
  });

  it('las acciones que ya se ven no repiten mensaje', () => {
    expect(outcomeMessage({ kind: 'toggled', id: 'drawer', open: true }, items)).toBeNull();
    expect(outcomeMessage({ kind: 'inspect', id: 'book' }, items)).toBeNull();
  });
});

describe('texto del objeto señalado', () => {
  it('nombre y acción; con la llave en la mano, «Usar: Llave pequeña»', () => {
    const game = newGame();
    expect(focusTexts(game, 'cabinet-door', items)).toEqual({
      name: TEXTS.objects.cabinet,
      action: TEXTS.actions.open,
    });
    game.interact('drawer', null);
    game.interact('small-key', null);
    game.inventory.select(0);
    expect(focusTexts(game, 'cabinet-door', items)).toEqual({
      name: TEXTS.objects.cabinet,
      action: `${TEXTS.actions.use}: ${TEXTS.objects.smallKey}`,
    });
  });

  it('un id desconocido no muestra nada', () => {
    expect(focusTexts(newGame(), 'nada', items)).toBeNull();
  });

  it('las piezas del panel son solo los bloques del inventario', () => {
    const game = newGame();
    game.inventory.add('small-key');
    game.inventory.add('block-circle');
    expect(piecesInInventory(game, items)).toEqual([
      { id: 'block-circle', name: TEXTS.objects.blockCircle, shape: 'circle' },
    ]);
  });
});
