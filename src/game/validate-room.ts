/**
 * Validación estática de una sala (regla de solución garantizada): referencias correctas,
 * sin ciclos, todo objeto se usa, toda pista se puede ver antes del puzzle que la necesita y
 * la salida es alcanzable. Devuelve la lista de errores (vacía si la sala es válida).
 */
import { puzzleNeeds } from './puzzles';
import type { InteractableDef, PuzzleDef, RoomDef } from './room';

function duplicates(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) dups.add(id);
    seen.add(id);
  }
  return [...dups];
}

export function validateRoom(room: RoomDef): string[] {
  const errors: string[] = [];
  const defs = new Map(room.interactables.map((d) => [d.id, d]));
  const puzzles = new Map(room.puzzles.map((p) => [p.id, p]));
  const items = new Map(room.items.map((i) => [i.id, i]));

  for (const id of duplicates(room.interactables.map((d) => d.id)))
    errors.push(`objeto duplicado: ${id}`);
  for (const id of duplicates(room.puzzles.map((p) => p.id)))
    errors.push(`puzzle duplicado: ${id}`);
  for (const id of duplicates(room.items.map((i) => i.id)))
    errors.push(`objeto de inventario duplicado: ${id}`);

  // Referencias.
  const pickupOf = new Map<string, InteractableDef>();
  const clueCarrier = new Map<string, InteractableDef>();
  for (const d of room.interactables) {
    if (d.insideOf !== undefined && !defs.has(d.insideOf))
      errors.push(`${d.id}: contenedor inexistente ${d.insideOf}`);
    if (d.revealedBy !== undefined && !puzzles.has(d.revealedBy))
      errors.push(`${d.id}: puzzle inexistente ${d.revealedBy}`);
    if (d.lock !== undefined && !puzzles.has(d.lock))
      errors.push(`${d.id}: cerradura inexistente ${d.lock}`);
    if (d.behavior === 'panel' && (d.puzzle === undefined || !puzzles.has(d.puzzle)))
      errors.push(`${d.id}: panel sin puzzle`);
    if (d.behavior === 'pickup') {
      if (d.item === undefined || !items.has(d.item))
        errors.push(`${d.id}: recoge un objeto inexistente`);
      else if (pickupOf.has(d.item)) errors.push(`${d.item}: se puede recoger en dos sitios`);
      else pickupOf.set(d.item, d);
    }
    if (d.clue !== undefined) clueCarrier.set(d.clue, d);
  }
  for (const p of room.puzzles) {
    if (!defs.has(p.target)) errors.push(`${p.id}: objetivo inexistente ${p.target}`);
    const needs = puzzleNeeds(p);
    for (const item of needs.items)
      if (!pickupOf.has(item)) errors.push(`${p.id}: el objeto ${item} no se puede conseguir`);
    for (const clue of needs.clues)
      if (!clueCarrier.has(clue)) errors.push(`${p.id}: la pista ${clue} no está en la sala`);
  }
  const used = new Set(room.puzzles.flatMap((p) => puzzleNeeds(p).items));
  for (const item of room.items) if (!used.has(item.id)) errors.push(`objeto sin uso: ${item.id}`);
  const exits = room.puzzles.filter((p) => p.type === 'key-lock' && p.exit === true);
  if (exits.length !== 1)
    errors.push(`la sala debe tener exactamente una salida (tiene ${exits.length})`);
  if (errors.length > 0) return errors;

  // Ciclos: un puzzle depende de los puzzles que dan acceso a su objetivo, objetos y pistas.
  const accessDeps = (id: string, trail: Set<string>): Set<string> => {
    const result = new Set<string>();
    const def = defs.get(id);
    if (!def || trail.has(id)) return result;
    trail.add(id);
    if (def.revealedBy !== undefined) result.add(def.revealedBy);
    if (def.insideOf !== undefined) {
      const container = defs.get(def.insideOf);
      if (container?.lock !== undefined) result.add(container.lock);
      for (const dep of accessDeps(def.insideOf, trail)) result.add(dep);
    }
    trail.delete(id);
    return result;
  };
  const puzzleDeps = (p: PuzzleDef): Set<string> => {
    const deps = accessDeps(p.target, new Set());
    const needs = puzzleNeeds(p);
    for (const item of needs.items) {
      const pickup = pickupOf.get(item);
      if (pickup) for (const dep of accessDeps(pickup.id, new Set())) deps.add(dep);
    }
    for (const clue of needs.clues) {
      const carrier = clueCarrier.get(clue);
      if (carrier) for (const dep of accessDeps(carrier.id, new Set())) deps.add(dep);
    }
    return deps;
  };
  const graph = new Map(room.puzzles.map((p) => [p.id, puzzleDeps(p)]));
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (id: string, path: string[]): void => {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'visiting') {
      errors.push(`ciclo: ${[...path, id].join(' → ')}`);
      return;
    }
    state.set(id, 'visiting');
    for (const dep of graph.get(id) ?? []) visit(dep, [...path, id]);
    state.set(id, 'done');
  };
  for (const p of room.puzzles) visit(p.id, []);
  if (errors.length > 0) return errors;

  // Alcance: se simula a un jugador que abre, recoge, mira y resuelve todo lo que puede.
  const solved = new Set<string>();
  const accessible = (id: string): boolean => {
    const def = defs.get(id);
    if (!def) return false;
    if (def.revealedBy !== undefined && !solved.has(def.revealedBy)) return false;
    if (def.insideOf === undefined) return true;
    const container = defs.get(def.insideOf);
    if (!container) return false;
    if (container.lock !== undefined && !solved.has(container.lock)) return false;
    return accessible(container.id);
  };
  let progress = true;
  while (progress) {
    progress = false;
    for (const p of room.puzzles) {
      if (solved.has(p.id) || !accessible(p.target)) continue;
      const needs = puzzleNeeds(p);
      const ok =
        needs.items.every((item) => accessible(pickupOf.get(item)?.id ?? '')) &&
        needs.clues.every((clue) => accessible(clueCarrier.get(clue)?.id ?? ''));
      if (ok) {
        solved.add(p.id);
        progress = true;
      }
    }
  }
  for (const p of room.puzzles) if (!solved.has(p.id)) errors.push(`puzzle inalcanzable: ${p.id}`);
  const exit = exits[0];
  if (exit && !solved.has(exit.id)) errors.push('la salida no es alcanzable');
  return errors;
}
