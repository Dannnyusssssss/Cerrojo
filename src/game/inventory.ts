/** Inventario: hasta `capacity` objetos, con uno seleccionado como mucho. Nada se puede perder. */

export class Inventory {
  readonly capacity: number;
  private readonly list: string[] = [];
  private selectedIndex: number | null = null;

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  get items(): readonly string[] {
    return this.list;
  }

  get isFull(): boolean {
    return this.list.length >= this.capacity;
  }

  has(item: string): boolean {
    return this.list.includes(item);
  }

  /** Añade un objeto. Devuelve false si está lleno o si ya lo tiene. */
  add(item: string): boolean {
    if (this.isFull || this.has(item)) return false;
    this.list.push(item);
    return true;
  }

  /** Quita un objeto (al usarlo bien). La selección se ajusta para no apuntar a otro. */
  remove(item: string): boolean {
    const index = this.list.indexOf(item);
    if (index < 0) return false;
    this.list.splice(index, 1);
    if (this.selectedIndex === index) this.selectedIndex = null;
    else if (this.selectedIndex !== null && this.selectedIndex > index) this.selectedIndex -= 1;
    return true;
  }

  /** Selecciona la casilla `index` (0-7); si ya estaba seleccionada, la suelta. */
  select(index: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.list.length) return;
    this.selectedIndex = this.selectedIndex === index ? null : index;
  }

  clearSelection(): void {
    this.selectedIndex = null;
  }

  get selected(): number | null {
    return this.selectedIndex;
  }

  get selectedItem(): string | null {
    return this.selectedIndex === null ? null : (this.list[this.selectedIndex] ?? null);
  }
}
