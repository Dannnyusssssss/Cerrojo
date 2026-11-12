/**
 * Resalte del objeto señalado: un contorno de aristas claro que se dibuja por encima de todo.
 * Va acompañado del nombre en pantalla (hud.ts), así que no depende solo del color.
 */
import { EdgesGeometry, LineBasicMaterial, LineSegments } from 'three';
import { forEachMesh, type PropView } from './props';

export class Highlighter {
  private readonly material = new LineBasicMaterial({
    color: 0xfff3c4,
    depthTest: false,
    transparent: true,
    opacity: 0.95,
  });
  private readonly outlines = new Map<string, LineSegments[]>();
  private current: string | null = null;

  show(prop: PropView | null): void {
    const id = prop?.def.id ?? null;
    if (id === this.current) return;
    if (this.current !== null) this.setVisible(this.current, false);
    this.current = id;
    if (prop === null) return;
    if (!this.outlines.has(prop.def.id)) this.outlines.set(prop.def.id, this.build(prop));
    this.setVisible(prop.def.id, true);
  }

  private build(prop: PropView): LineSegments[] {
    const lines: LineSegments[] = [];
    forEachMesh(prop.body, (mesh) => {
      const outline = new LineSegments(new EdgesGeometry(mesh.geometry, 30), this.material);
      outline.renderOrder = 999;
      outline.visible = false;
      mesh.add(outline);
      lines.push(outline);
    });
    return lines;
  }

  private setVisible(id: string, visible: boolean): void {
    for (const line of this.outlines.get(id) ?? []) line.visible = visible;
  }

  /** Libera los contornos (al cambiar de sala). */
  dispose(): void {
    for (const lines of this.outlines.values()) {
      for (const line of lines) {
        line.geometry.dispose();
        line.removeFromParent();
      }
    }
    this.outlines.clear();
    this.current = null;
    this.material.dispose();
  }
}
