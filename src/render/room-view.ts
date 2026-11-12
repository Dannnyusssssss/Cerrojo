/**
 * Construye la vista 3D de una sala a partir de sus datos y la libera al cambiar de sala.
 */
import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  SphereGeometry,
  type Material,
  type Object3D,
  type Texture,
} from 'three';
import { QUALITY_PROFILES, type Quality } from '../data/config';
import type { GameState } from '../game/game-state';
import type { FurnitureDef, RoomDef } from '../game/room';
import type { RoomAnswers } from '../game/seeded';
import { buildOpenBox, forEachMesh, interiorMaterial } from './prop-kit';
import type { PropView } from './prop-view';
import { createProp } from './props';
import { TextureFactory } from './textures';
import { nightWall } from './textures-extra';

export class RoomView {
  readonly group = new Group();
  readonly props = new Map<string, PropView>();
  private readonly textures: TextureFactory;
  private syncedVersion = -1;

  constructor(room: RoomDef, quality: Quality, answers: RoomAnswers) {
    const profile = QUALITY_PROFILES[quality];
    this.textures = new TextureFactory(profile.textureSize);
    this.buildShell(room);
    for (const f of room.furniture) this.group.add(this.buildFurniture(f));
    for (const def of room.interactables) {
      const prop = createProp(def, { textures: this.textures, answers, room });
      this.props.set(def.id, prop);
      this.group.add(prop.root);
    }
    this.buildLights(room, profile.shadows);
  }

  /**
   * Refleja el estado de la partida: qué objetos se ven, cuáles están abiertos y qué huecos
   * están ocupados. Solo trabaja cuando el estado cambió.
   */
  sync(state: GameState, instant: boolean): void {
    if (!instant && this.syncedVersion === state.version) return;
    this.syncedVersion = state.version;
    for (const [id, prop] of this.props) {
      const def = prop.def;
      prop.setVisible(state.isVisible(id));
      const solvedPanel =
        def.behavior === 'panel' && def.puzzle !== undefined && state.isSolved(def.puzzle);
      prop.setOpen(state.isOpen(id) || solvedPanel, instant);
      if (def.puzzle !== undefined) {
        prop.setSlots(state.placementSlots(def.puzzle).map((slot) => slot !== null));
      }
    }
  }

  update(dt: number): void {
    for (const prop of this.props.values()) prop.update(dt);
  }

  private buildShell(room: RoomDef): void {
    const { width: w, depth: d, height: h } = room;
    const floor = new Mesh(
      new PlaneGeometry(w, d),
      new MeshStandardMaterial({
        map: this.textures.floor({ x: w / 1.5, y: d / 1.5 }),
        roughness: 0.85,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;

    const ceiling = new Mesh(
      new PlaneGeometry(w, d),
      new MeshStandardMaterial({ map: this.textures.ceiling(), roughness: 1 }),
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = h;

    const wallMaterial = (length: number): MeshStandardMaterial =>
      new MeshStandardMaterial({
        map: this.wallTexture(room, length, h),
        roughness: 0.95,
      });
    const walls: { x: number; z: number; ry: number; length: number }[] = [
      { x: 0, z: -d / 2, ry: 0, length: w },
      { x: 0, z: d / 2, ry: Math.PI, length: w },
      { x: -w / 2, z: 0, ry: Math.PI / 2, length: d },
      { x: w / 2, z: 0, ry: -Math.PI / 2, length: d },
    ];
    for (const wall of walls) {
      const mesh = new Mesh(new PlaneGeometry(wall.length, h), wallMaterial(wall.length));
      mesh.position.set(wall.x, h / 2, wall.z);
      mesh.rotation.y = wall.ry;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
    // Rodapié para marcar el encuentro entre suelo y pared.
    const trim = new MeshStandardMaterial({ color: 0x5a3b22, roughness: 0.7 });
    for (const wall of walls) {
      const board = new Mesh(new BoxGeometry(wall.length, 0.1, 0.02), trim);
      board.position.set(wall.x, 0.05, wall.z);
      board.rotation.y = wall.ry;
      board.translateZ(0.01);
      this.group.add(board);
    }
    this.group.add(floor, ceiling);
    // Tabiques interiores: bloques a toda altura con el mismo acabado que las paredes.
    for (const p of room.partitions ?? []) {
      const pw = p.maxX - p.minX;
      const pd = p.maxZ - p.minZ;
      const block = new Mesh(new BoxGeometry(pw, h, pd), wallMaterial(Math.max(pw, pd)));
      block.position.set((p.minX + p.maxX) / 2, h / 2, (p.minZ + p.maxZ) / 2);
      block.castShadow = true;
      block.receiveShadow = true;
      this.group.add(block);
    }
  }

  /** Textura de las paredes según el acabado de la sala. */
  private wallTexture(room: RoomDef, length: number, h: number): Texture {
    switch (room.walls) {
      case 'brick':
        return this.textures.brick({ x: length / 1.2, y: h / 1.2 });
      case 'night':
        return nightWall(this.textures, { x: length / 1.5, y: h / 1.5 });
      default:
        return this.textures.wallpaper({ x: length / 1.5, y: h / 1.5 });
    }
  }

  private buildFurniture(f: FurnitureDef): Object3D {
    const group = new Group();
    group.position.set(f.x, 0, f.z);
    const wood = new MeshStandardMaterial({
      map: this.textures.wood(),
      color: 0xd2a679,
      roughness: 0.7,
    });
    const dark = new MeshStandardMaterial({
      map: this.textures.wood(),
      color: 0x8a6a4a,
      roughness: 0.7,
    });
    const add = (
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      m: Material,
    ): void => {
      const mesh = new Mesh(new BoxGeometry(w, h, d), m);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    };
    const top = 0.05;
    const steel = new MeshStandardMaterial({ color: 0x6f767a, roughness: 0.5, metalness: 0.5 });
    switch (f.kind) {
      case 'workbench': {
        // Tablero grueso, patas, balda baja y cuerpo de cajón (el cajón interactuable va delante).
        // El tablero se dibuja 4 mm por debajo de su altura lógica para que lo que se apoya
        // encima (la caja de herramientas) no parpadee contra él.
        const thick = 0.07;
        add(f.w, thick, f.d, 0, f.h - thick / 2 - 0.004, 0, dark);
        const legX = f.w / 2 - 0.06;
        const legZ = f.d / 2 - 0.06;
        for (const sx of [-1, 1]) {
          for (const sz of [-1, 1])
            add(0.08, f.h - thick, 0.08, sx * legX, (f.h - thick) / 2, sz * legZ, dark);
        }
        add(f.w - 0.12, 0.03, f.d - 0.12, 0, 0.18, 0, wood);
        add(0.6, 0.3, f.d - 0.04, -f.w / 2 + 0.4, f.h - thick - 0.15, 0, wood);
        break;
      }
      case 'rack': {
        // Estantería metálica abierta con tarros decorativos (de cara a la sala, +x).
        for (const sz of [-1, 1]) {
          for (const sx of [-1, 1])
            add(0.04, f.h, 0.04, sx * (f.w / 2 - 0.02), f.h / 2, sz * (f.d / 2 - 0.02), steel);
        }
        const jarMat = new MeshStandardMaterial({
          color: 0x9fb7a8,
          roughness: 0.3,
          metalness: 0.1,
        });
        const jarGeo = new CylinderGeometry(0.06, 0.06, 0.16, 12);
        for (let i = 0; i < 4; i++) {
          const y = 0.1 + i * ((f.h - 0.15) / 3);
          add(f.w, 0.025, f.d, 0, y, 0, steel);
          if (i < 3) {
            for (const z of [-0.4, 0.05, 0.42]) {
              const jar = new Mesh(jarGeo, jarMat);
              jar.position.set(0.05, y + 0.095, z * (f.d / 1.4) + (i % 2) * 0.08);
              jar.castShadow = true;
              group.add(jar);
            }
          }
        }
        break;
      }
      case 'pedestal': {
        // Pie de madera oscura: columna con base y tapa algo más anchas.
        add(f.w * 0.7, f.h - 0.08, f.d * 0.7, 0, f.h / 2, 0, dark);
        add(f.w, 0.04, f.d, 0, 0.02, 0, dark);
        add(f.w, 0.04, f.d, 0, f.h - 0.024, 0, wood);
        break;
      }
      case 'crate': {
        // Cajón de madera de listones: caja y tres listones en cada lado. Se dibuja 4 mm más
        // bajo que su altura lógica para que lo que va encima (la caja fuerte) no parpadee.
        add(f.w, f.h - 0.004, f.d, 0, (f.h - 0.004) / 2, 0, wood);
        for (const y of [0.25, 0.5, 0.75]) {
          add(f.w + 0.01, 0.02, f.d + 0.01, 0, f.h * y, 0, dark);
        }
        break;
      }
      case 'table':
      case 'desk': {
        add(f.w, top, f.d, 0, f.h - top / 2, 0, wood);
        const legX = f.w / 2 - 0.05;
        const legZ = f.d / 2 - 0.05;
        for (const sx of [-1, 1]) {
          for (const sz of [-1, 1])
            add(0.06, f.h - top, 0.06, sx * legX, (f.h - top) / 2, sz * legZ, dark);
        }
        if (f.kind === 'desk') {
          // Cuerpo de cajones bajo el tablero (el cajón interactuable va delante).
          add(0.6, 0.3, f.d - 0.04, -f.w / 2 + 0.4, f.h - top - 0.15, 0, dark);
        }
        break;
      }
      case 'cabinet': {
        // Armario hueco con el frente abierto hacia la sala (-x); la puerta es un objeto aparte.
        const carcass = buildOpenBox(f.w, f.h, f.d, 'nx', dark, interiorMaterial(0x3a2416));
        // Unos milímetros sobre el suelo para que el fondo no parpadee contra él.
        carcass.position.y = f.h / 2 + 0.003;
        group.add(carcass);
        // Marco frontal: da grosor visible a las paredes alrededor de la abertura.
        const frame = 0.05;
        const fx = -f.w / 2 + 0.015;
        for (const side of [-1, 1]) {
          add(0.03, f.h, frame, fx, f.h / 2, side * (f.d / 2 - frame / 2), dark);
        }
        add(0.03, frame, f.d, fx, f.h - frame / 2, 0, dark);
        add(0.03, 0.1, f.d, fx, 0.05, 0, dark);
        // Estantes interiores, más claros que el fondo para que se lea la profundidad.
        const shelfMat = new MeshStandardMaterial({ color: 0x7a5232, roughness: 0.8 });
        for (const level of [0.36, 0.66]) {
          add(f.w - 0.03, 0.025, f.d - 0.02, 0.015, f.h * level, 0, shelfMat);
        }
        break;
      }
      case 'shelf': {
        const shelves = 4;
        add(f.w, f.h, 0.03, 0, f.h / 2, -f.d / 2 + 0.015, dark);
        add(f.w, f.h, 0.03, 0, f.h / 2, f.d / 2 - 0.015, dark);
        add(0.03, f.h, f.d, -f.w / 2 + 0.015, f.h / 2, 0, dark);
        const spines = new MeshStandardMaterial({
          map: this.textures.bookSpines(),
          roughness: 0.8,
        });
        for (let i = 0; i <= shelves; i++) {
          const y = (i / shelves) * (f.h - 0.03) + 0.015;
          add(f.w, 0.03, f.d, 0, y, 0, wood);
          if (i < shelves) {
            // Fila de libros decorativos, de cara a la sala (+x).
            const rowH = (f.h / shelves) * 0.7;
            const row = new Mesh(new PlaneGeometry(f.d - 0.08, rowH), spines);
            row.position.set(f.w / 2 - 0.12, y + 0.015 + rowH / 2, 0);
            row.rotation.y = Math.PI / 2;
            group.add(row);
          }
        }
        break;
      }
    }
    return group;
  }

  private buildLights(room: RoomDef, shadows: boolean): void {
    this.group.add(new HemisphereLight(0xfff1dc, 0x5a4636, 1.2));
    const lamps = room.lamps ?? [{ x: 0, z: 0 }];
    // Con varias lámparas, cada una alumbra un poco menos; solo la primera da sombras.
    const intensity = 9 / Math.sqrt(lamps.length);
    lamps.forEach((spot, i) => {
      const lamp = new PointLight(0xffd9a8, intensity, 12, 1.6);
      lamp.position.set(spot.x, room.height - 0.35, spot.z);
      lamp.castShadow = shadows && i === 0;
      lamp.shadow.mapSize.set(1024, 1024);
      lamp.shadow.bias = -0.002;
      this.group.add(lamp);
      // Bombilla visible: material emisivo, no una luz adicional.
      const bulb = new Mesh(
        new SphereGeometry(0.08, 16, 12),
        new MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffd9a8, emissiveIntensity: 2 }),
      );
      bulb.position.copy(lamp.position);
      this.group.add(bulb);
    });
  }

  dispose(): void {
    const materials = new Set<Material>();
    forEachMesh(this.group, (m) => {
      m.geometry.dispose();
      const list = Array.isArray(m.material) ? m.material : [m.material];
      for (const material of list) materials.add(material);
    });
    for (const material of materials) material.dispose();
    this.textures.dispose();
    this.group.removeFromParent();
    this.props.clear();
  }
}
