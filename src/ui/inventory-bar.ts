/**
 * Barra de inventario: hasta 8 casillas con icono, número y nombre accesible. La casilla en la
 * mano se marca con borde grueso y una flecha (no solo con color).
 */
import type { ItemDef } from '../game/room';
import { TEXTS } from '../data/texts';
import { el, setHidden } from './dom';
import { itemIcon } from './icons';

export class InventoryBar {
  readonly root: HTMLDivElement;
  private readonly onSelect: (index: number) => void;
  private readonly items: ReadonlyMap<string, ItemDef>;
  private lastKey = '';
  /** Si la interfaz del juego quiere mostrar la barra (se oculta igualmente si está vacía). */
  private wanted = false;

  constructor(items: readonly ItemDef[], onSelect: (index: number) => void) {
    this.items = new Map(items.map((i) => [i.id, i]));
    this.onSelect = onSelect;
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

  /** Vuelve a dibujar las casillas si cambió el contenido o la selección. */
  update(list: readonly string[], selected: number | null): void {
    const key = `${list.join('|')}#${selected ?? ''}`;
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
    this.root.replaceChildren(...buttons);
    setHidden(this.root, !this.wanted || buttons.length === 0);
  }
}
