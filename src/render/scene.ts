/**
 * Renderer, escena y cámara principales. Se ajusta al tamaño del contenedor, a la orientación
 * y a la densidad de píxeles, con el tope de la calidad elegida.
 */
import {
  Color,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { QUALITY_PROFILES, type Quality } from '../data/config';
import { GameError } from '../core/errors';

export class SceneView {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  private readonly container: HTMLElement;
  private quality: Quality;
  private readonly resizeObserver: ResizeObserver;
  private readonly onWindowResize = (): void => {
    this.resize();
  };
  /**
   * Consulta que deja de cumplirse cuando cambia la densidad de píxeles (mover la ventana a
   * otra pantalla). Eso no siempre dispara 'resize', así que se vigila aparte.
   */
  private pixelRatioQuery: MediaQueryList | null = null;
  private readonly onPixelRatioChange = (): void => {
    this.watchPixelRatio();
    this.resize();
  };

  constructor(container: HTMLElement, quality: Quality, fov: number) {
    this.container = container;
    this.quality = quality;
    try {
      this.renderer = new WebGLRenderer({
        antialias: quality !== 'low',
        powerPreference: 'default',
      });
    } catch (error) {
      throw new GameError('noWebgl', 'No se pudo crear el contexto WebGL', { cause: error });
    }
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.shadowMap.type = PCFShadowMap;
    // Las sombras se recalculan solo cuando la sala cambia (ver RoomView.takeShadowsDirty).
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.domElement.className = 'game-canvas';
    this.renderer.domElement.tabIndex = -1;
    this.scene.background = new Color(0x1d1a17);
    this.camera = new PerspectiveCamera(fov, 1, 0.05, 50);
    container.appendChild(this.renderer.domElement);
    this.applyQuality();
    this.resizeObserver = new ResizeObserver(this.onWindowResize);
    this.resizeObserver.observe(container);
    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('orientationchange', this.onWindowResize);
    this.watchPixelRatio();
    this.resize();
  }

  /** Vuelve a vigilar la densidad actual (la consulta anterior ya no sirve). */
  private watchPixelRatio(): void {
    this.pixelRatioQuery?.removeEventListener('change', this.onPixelRatioChange);
    this.pixelRatioQuery = null;
    if (typeof window.matchMedia !== 'function') return;
    this.pixelRatioQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    this.pixelRatioQuery.addEventListener('change', this.onPixelRatioChange);
  }

  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  setQuality(quality: Quality): void {
    this.quality = quality;
    this.applyQuality();
    this.resize();
  }

  setFov(fov: number): void {
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }

  resize(): void {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const ratio = Math.min(
      window.devicePixelRatio || 1,
      QUALITY_PROFILES[this.quality].maxPixelRatio,
    );
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private applyQuality(): void {
    this.renderer.shadowMap.enabled = QUALITY_PROFILES[this.quality].shadows;
    this.renderer.shadowMap.needsUpdate = true;
  }

  dispose(): void {
    this.resizeObserver.disconnect();
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('orientationchange', this.onWindowResize);
    this.pixelRatioQuery?.removeEventListener('change', this.onPixelRatioChange);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
