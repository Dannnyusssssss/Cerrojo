/**
 * Vista del juego: escena, sala, resalte, vista de examen y el rayo de los toques. Reúne lo
 * que el controlador necesita del render sin conocer sus detalles.
 */
import { Raycaster, Vector2 } from 'three';
import type { Vec3 } from '../core/math';
import { PLAYER, type Quality } from '../data/config';
import type { GameState } from '../game/game-state';
import type { PlayerState } from '../game/player';
import type { RoomDef } from '../game/room';
import type { RoomAnswers } from '../game/seeded';
import { applyCamera } from './camera-rig';
import { Highlighter } from './highlight';
import { InspectView } from './inspect-view';
import { RoomView } from './room-view';
import { SceneView } from './scene';

export class GameView {
  readonly scene: SceneView;
  readonly inspect = new InspectView();
  private roomView: RoomView | null = null;
  private highlighter = new Highlighter();
  private highlighted: string | null = null;
  private loaded: { room: RoomDef; answers: RoomAnswers } | null = null;
  private readonly raycaster = new Raycaster();
  private readonly ndc = new Vector2();

  /** Lanza GameError('noWebgl') si el navegador no puede crear el contexto 3D. */
  constructor(stage: HTMLElement, quality: Quality, fov: number) {
    this.scene = new SceneView(stage, quality, fov);
  }

  get canvas(): HTMLCanvasElement {
    return this.scene.canvas;
  }

  /** Construye la sala de una partida (libera la anterior) y la pone en el estado actual. */
  load(room: RoomDef, answers: RoomAnswers, state: GameState, quality: Quality): void {
    this.loaded = { room, answers };
    this.rebuild(state, quality);
  }

  /** Vuelve a construir la sala cargada (al cambiar la calidad: texturas y sombras). */
  rebuild(state: GameState, quality: Quality): void {
    if (!this.loaded) return;
    this.highlighter.dispose();
    this.highlighter = new Highlighter();
    this.highlighted = null;
    this.roomView?.dispose();
    this.roomView = new RoomView(this.loaded.room, quality, this.loaded.answers);
    this.roomView.sync(state, true);
    this.scene.scene.add(this.roomView.group);
  }

  sync(state: GameState): void {
    this.roomView?.sync(state, false);
  }

  highlight(id: string | null): void {
    if (id === this.highlighted) return;
    this.highlighted = id;
    this.highlighter.show(id === null ? null : (this.roomView?.props.get(id) ?? null));
  }

  /** Abre la vista de examen de un objeto. Devuelve false si no existe. */
  openInspect(id: string, reduceMotion: boolean): boolean {
    const prop = this.roomView?.props.get(id);
    if (!prop) return false;
    this.inspect.open(prop, reduceMotion);
    return true;
  }

  update(dt: number): void {
    this.roomView?.update(dt);
    this.inspect.update(dt);
  }

  /** Dibuja la sala desde los ojos del jugador y, encima, la vista de examen. Devuelve las llamadas de dibujo. */
  render(player: PlayerState, alpha: number): number {
    const { renderer, scene, camera } = this.scene;
    applyCamera(camera, player, alpha, PLAYER.eyeHeight);
    renderer.render(scene, camera);
    const calls = renderer.info.render.calls;
    this.inspect.render(renderer, camera.aspect);
    return calls;
  }

  /** Dirección del rayo que sale de la cámara por un punto de la pantalla (un toque). */
  directionAt(clientX: number, clientY: number): Vec3 {
    const rect = this.canvas.getBoundingClientRect();
    this.ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.ndc, this.scene.camera);
    const d = this.raycaster.ray.direction;
    return { x: d.x, y: d.y, z: d.z };
  }

  applySettings(fov: number, quality: Quality): void {
    this.scene.setFov(fov);
    this.scene.setQuality(quality);
  }
}
