/**
 * Vista de examen: el objeto se muestra de cerca en una capa aparte, sobre la escena atenuada.
 * La cámara del jugador no se mueve. Entrada y salida con un fundido corto, o un corte con
 * «Reducir movimiento».
 */
import {
  Box3,
  DirectionalLight,
  Group,
  HemisphereLight,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Vector3,
  type WebGLRenderer,
} from 'three';
import { clamp } from '../core/math';
import { INSPECT } from '../data/config';
import type { PropView } from './props';

const FIT_SIZE = 0.55;
const CAMERA_DISTANCE = 1.2;
const MAX_TILT = 1.4;

export class InspectView {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(35, 1, 0.05, 10);
  private readonly holder = new Group();
  private readonly dimMaterial = new MeshBasicMaterial({
    color: 0x0d0b09,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
  });
  private readonly dim = new Mesh(new PlaneGeometry(20, 20), this.dimMaterial);
  private readonly box = new Box3();
  private readonly center = new Vector3();
  private readonly sizeVec = new Vector3();
  private fade = 0;
  private fadeTarget = 0;
  private spinY = 0;
  private tilt = 0;

  /** Escena aparte para el velo: se dibuja antes que el objeto, en su propia pasada. */
  private readonly dimScene = new Scene();
  private readonly dimCamera = new PerspectiveCamera(35, 1, 0.05, 10);

  constructor() {
    this.camera.position.set(0, 0, CAMERA_DISTANCE);
    this.dim.position.set(0, 0, -2);
    this.dimScene.add(this.dim);
    this.scene.add(this.camera, this.holder);
    this.scene.add(new HemisphereLight(0xfff1dc, 0x3a2e24, 1.6));
    const key = new DirectionalLight(0xffffff, 1.6);
    key.position.set(1, 2, 3);
    this.scene.add(key);
  }

  /** True mientras la capa está visible (incluido el fundido de salida). */
  get visible(): boolean {
    return this.fade > 0 || this.fadeTarget > 0;
  }

  open(prop: PropView, reduceMotion: boolean): void {
    this.clearHolder();
    const clone = prop.body.clone(true);
    // El contorno de resalte no forma parte del objeto examinado.
    const outlines: LineSegments[] = [];
    clone.traverse((child) => {
      if (child instanceof LineSegments) outlines.push(child as LineSegments);
    });
    for (const line of outlines) line.removeFromParent();
    clone.rotation.set(0, 0, 0);
    this.box.setFromObject(clone);
    this.box.getCenter(this.center);
    this.box.getSize(this.sizeVec);
    const largest = Math.max(this.sizeVec.x, this.sizeVec.y, this.sizeVec.z, 1e-3);
    const scale = FIT_SIZE / largest;
    clone.position.sub(this.center);
    const pivot = new Group();
    pivot.add(clone);
    pivot.scale.setScalar(scale);
    this.holder.add(pivot);
    // Vista inicial ligeramente desde arriba y de frente.
    this.spinY = 0;
    this.tilt = 0.35;
    this.applyRotation();
    this.fadeTarget = 1;
    if (reduceMotion) this.fade = 1;
  }

  close(reduceMotion: boolean): void {
    this.fadeTarget = 0;
    if (reduceMotion) {
      this.fade = 0;
      this.clearHolder();
    }
  }

  /** Gira el objeto examinado (arrastre o flechas), en radianes. */
  rotate(yaw: number, pitch: number): void {
    if (!Number.isFinite(yaw) || !Number.isFinite(pitch)) return;
    this.spinY += yaw;
    this.tilt = clamp(this.tilt + pitch, -MAX_TILT, MAX_TILT);
    this.applyRotation();
  }

  update(dt: number): void {
    if (this.fade === this.fadeTarget) return;
    const step = dt / INSPECT.fadeSeconds;
    this.fade =
      this.fadeTarget > this.fade
        ? Math.min(this.fadeTarget, this.fade + step)
        : Math.max(this.fadeTarget, this.fade - step);
    if (this.fade === 0) this.clearHolder();
  }

  render(renderer: WebGLRenderer, aspect: number): void {
    if (!this.visible) return;
    this.dimMaterial.opacity = 0.7 * this.fade;
    this.holder.visible = this.fade > 0.15;
    this.camera.aspect = aspect;
    // En pantallas verticales se aleja la cámara para que el objeto quepa a lo ancho.
    this.camera.position.z =
      aspect < 1 ? CAMERA_DISTANCE / Math.max(aspect, 0.45) : CAMERA_DISTANCE;
    this.camera.updateProjectionMatrix();
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    // Primero el velo sobre la sala y después el objeto, para que el velo no lo oscurezca.
    renderer.render(this.dimScene, this.dimCamera);
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
    renderer.autoClear = autoClear;
  }

  private applyRotation(): void {
    const pivot = this.holder.children[0];
    if (!pivot) return;
    pivot.rotation.order = 'XYZ';
    pivot.rotation.set(this.tilt, this.spinY, 0);
  }

  private clearHolder(): void {
    // Los clones comparten geometría y materiales con la sala: solo se retiran, no se liberan.
    this.holder.clear();
  }

  dispose(): void {
    this.clearHolder();
    this.dim.geometry.dispose();
    this.dimMaterial.dispose();
  }
}
