/**
 * Validación estática de una sala (regla de solución garantizada): referencias correctas,
 * sin ciclos, todo objeto se consigue de un solo modo y se usa en un solo puzzle, el inventario
 * nunca se llena, toda pista se puede ver antes del puzzle que la necesita y la salida es
 * alcanzable. Devuelve la lista de errores (vacía si la sala es válida).
 */
import { INVENTORY_CAPACITY } from './game-state';
import { puzzleNeeds, puzzleResult } from './puzzles';
import { puzzleTarget, type InteractableDef, type PuzzleDef, type RoomDef } from './room';

/** Comprobaciones propias de cada tipo (medidas y formas coherentes). */
function checkPuzzleShape(p: PuzzleDef, errors: string[]): void {
  switch (p.type) {
    case 'sequence':
      if (p.switches.length < 2 || new Set(p.switches).size !== p.switches.length)
        errors.push(`${p.id}: los interruptores deben tener formas distintas (al menos 2)`);
      break;
    case 'dial':
      if (
        !Number.isInteger(p.dials) ||
        p.dials < 1 ||
        !Number.isInteger(p.positions) ||
        p.positions < 2
      )
        errors.push(`${p.id}: diales o posiciones inválidos`);
      break;
    case 'symbol-lock':
      if (
        new Set(p.symbols).size !== p.symbols.length ||
        p.wheels < 1 ||
        p.wheels > p.symbols.length
      )
        errors.push(`${p.id}: la cerradura necesita formas distintas y no más ruedas que formas`);
      break;
    case 'combine':
      if (p.inputs[0] === p.inputs[1]) errors.push(`${p.id}: combina un objeto consigo mismo`);
      break;
    default:
      break;
  }
}

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
  // Con tantos objetos como casillas como mucho, el inventario nunca se llena.
  if (room.items.length > INVENTORY_CAPACITY)
    errors.push(`demasiados objetos: ${room.items.length} (máximo ${INVENTORY_CAPACITY})`);

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
  // Objetos que se obtienen al combinar otros.
  const madeBy = new Map<string, PuzzleDef>();
  for (const p of room.puzzles) {
    const result = puzzleResult(p);
    if (result === null) continue;
    if (!items.has(result)) errors.push(`${p.id}: entrega un objeto inexistente ${result}`);
    else if (pickupOf.has(result) || madeBy.has(result))
      errors.push(`${result}: se puede conseguir de dos modos`);
    else madeBy.set(result, p);
  }
  const consumedBy = new Map<string, string>();
  for (const p of room.puzzles) {
    checkPuzzleShape(p, errors);
    const target = puzzleTarget(p);
    if (target !== undefined && !defs.has(target))
      errors.push(`${p.id}: objetivo inexistente ${target}`);
    const needs = puzzleNeeds(p);
    for (const item of needs.items) {
      if (!pickupOf.has(item) && !madeBy.has(item))
        errors.push(`${p.id}: el objeto ${item} no se puede conseguir`);
      // Usar un objeto lo gasta: si dos puzzles lo necesitaran, uno quedaría sin solución.
      const other = consumedBy.get(item);
      if (other !== undefined) errors.push(`${item}: lo necesitan ${other} y ${p.id}`);
      consumedBy.set(item, p.id);
    }
    for (const clue of needs.clues)
      if (!clueCarrier.has(clue)) errors.push(`${p.id}: la pista ${clue} no está en la sala`);
  }
  for (const item of room.items)
    if (!consumedBy.has(item.id)) errors.push(`objeto sin uso: ${item.id}`);
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
    const target = puzzleTarget(p);
    const deps = target === undefined ? new Set<string>() : accessDeps(target, new Set());
    const needs = puzzleNeeds(p);
    for (const item of needs.items) {
      const pickup = pickupOf.get(item);
      if (pickup) for (const dep of accessDeps(pickup.id, new Set())) deps.add(dep);
      const maker = madeBy.get(item);
      if (maker) deps.add(maker.id);
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
  const obtainable = (item: string): boolean => {
    const maker = madeBy.get(item);
    if (maker) return solved.has(maker.id);
    return accessible(pickupOf.get(item)?.id ?? '');
  };
  let progress = true;
  while (progress) {
    progress = false;
    for (const p of room.puzzles) {
      const target = puzzleTarget(p);
      if (solved.has(p.id) || (target !== undefined && !accessible(target))) continue;
      const needs = puzzleNeeds(p);
      const ok =
        needs.items.every(obtainable) &&
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
