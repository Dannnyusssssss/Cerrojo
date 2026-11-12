/**
 * Barra de inventario: hasta 8 casillas con icono, número y nombre accesible. La casilla en la
 * mano se marca con borde grueso y una flecha (no solo con color). Con un objeto en la mano
 * aparece el botón «Combinar» (también la tecla C); mientras se combina, el botón queda pulsado
 * y su texto cambia.
 */
import type { ItemDef } from '../game/room';
import { TEXTS } from '../data/texts';
import { el, setHidden } from './dom';
import { itemIcon } from './icons';

export class InventoryBar {
  readonly root: HTMLDivElement;
  private readonly onSelect: (index: number) => void;
  private items: ReadonlyMap<string, ItemDef>;
  private lastKey = '';
  /** Si la interfaz del juego quiere mostrar la barra (se oculta igualmente si está vacía). */
  private wanted = false;

  private readonly onCombine: () => void;

  constructor(items: readonly ItemDef[], onSelect: (index: number) => void, onCombine: () => void) {
    this.items = new Map(items.map((i) => [i.id, i]));
    this.onSelect = onSelect;
    this.onCombine = onCombine;
    this.root = el('div', {
      className: 'inventory-bar',
      attrs: { role: 'toolbar', 'aria-label': TEXTS.inventory.label },
    });
    setHidden(this.root, true);
  }

  setVisible(visible: boolean): void {
    this.wanted = visible;
    setHidden(this.root, !visible || this.root.childElementCount === 0);
  }

  /** Objetos de la sala en juego (al cambiar de sala). */
  setItems(items: readonly ItemDef[]): void {
    this.items = new Map(items.map((i) => [i.id, i]));
    this.lastKey = '';
  }

  /** Vuelve a dibujar las casillas si cambió el contenido, la selección o el modo combinar. */
  update(list: readonly string[], selected: number | null, combining: boolean): void {
    const key = `${list.join('|')}#${selected ?? ''}#${String(combining)}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    const buttons = list.map((id, index) => {
      const def = this.items.get(id);
      const name = def ? TEXTS.objects[def.nameKey] : id;
      const isSelected = index === selected;
      const button = el(
        'button',
        {
          className: isSelected ? 'inv-slot inv-slot-selected' : 'inv-slot',
          attrs: {
            type: 'button',
            'aria-pressed': String(isSelected),
            'aria-label': TEXTS.inventory.slot(index + 1, name),
            title: name,
          },
        },
        [
          el('span', { className: 'inv-number', text: String(index + 1) }),
          ...(def ? [itemIcon(def.icon, def.shape)] : []),
        ],
      );
      button.addEventListener('click', () => {
        this.onSelect(index);
      });
      return button;
    });
    const extra: HTMLButtonElement[] = [];
    if (selected !== null && list.length > 1) {
      const combine = el('button', {
        className: combining ? 'inv-combine inv-combine-on' : 'inv-combine',
        text: combining ? TEXTS.inventory.combining : TEXTS.inventory.combine,
        attrs: { type: 'button', 'aria-pressed': String(combining) },
      });
      combine.addEventListener('click', () => {
        this.onCombine();
      });
      extra.push(combine);
    }
    this.root.replaceChildren(...buttons, ...extra);
    setHidden(this.root, !this.wanted || buttons.length === 0);
  }
}
