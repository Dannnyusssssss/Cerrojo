/**
 * Pantallas de menú: inicio (con nota de contenido), pausa y ajustes. Botones y controles
 * nativos, manejables con Tab, flechas y Enter.
 */
import { QUALITIES, SETTINGS_RANGES, type Quality, type Settings } from '../data/config';
import { TEXTS } from '../data/texts';
import { button, el, setHidden } from './dom';

export type Screen = 'start' | 'pause' | 'settings' | 'result';

export interface MenuCallbacks {
  onPlay(): void;
  onResume(): void;
  /** Recibe los valores leídos de los controles; quien llama los valida y guarda. */
  onSettingsChange(values: Settings): void;
  /** Pantalla de resultado: nueva partida con otra semilla, o volver al inicio. */
  onReplay(): void;
  onHome(): void;
}

export class Menus {
  readonly root: HTMLDivElement;
  private readonly screens: Record<Screen, HTMLElement>;
  private readonly pauseHint: HTMLParagraphElement;
  private readonly resultTime: HTMLParagraphElement;
  private readonly resultAids: HTMLParagraphElement;
  private readonly resultTitle: HTMLHeadingElement;
  private readonly callbacks: MenuCallbacks;
  private current: Screen | null = null;
  private settingsReturn: Screen = 'start';
  private controls!: {
    sensitivity: HTMLInputElement;
    sensitivityValue: HTMLOutputElement;
    fov: HTMLInputElement;
    fovValue: HTMLOutputElement;
    quality: HTMLSelectElement;
    invertY: HTMLInputElement;
    muted: HTMLInputElement;
    reduceMotion: HTMLInputElement;
  };

  constructor(callbacks: MenuCallbacks) {
    this.callbacks = callbacks;
    this.pauseHint = el('p', { className: 'pause-hint', text: TEXTS.pause.clickToContinue });
    this.resultTime = el('p', { className: 'result-time' });
    this.resultAids = el('p', { className: 'pause-hint', text: TEXTS.result.withAids });
    this.resultTitle = el('h2', { className: 'screen-title' });
    this.screens = {
      start: this.buildStart(),
      pause: this.buildPause(),
      settings: this.buildSettings(),
      result: this.buildResult(),
    };
    this.root = el('div', { className: 'menus' }, Object.values(this.screens));
    this.show(null);
  }

  get screen(): Screen | null {
    return this.current;
  }

  show(screen: Screen | null, options: { lockLost?: boolean } = {}): void {
    this.current = screen;
    for (const [name, element] of Object.entries(this.screens)) {
      setHidden(element, name !== screen);
    }
    setHidden(this.root, screen === null);
    if (screen === 'pause') setHidden(this.pauseHint, options.lockLost !== true);
    if (screen !== null) {
      this.screens[screen].querySelector<HTMLElement>('button, input, select')?.focus();
    }
  }

  openSettings(from: Screen): void {
    this.settingsReturn = from;
    this.show('settings');
  }

  /** Vuelve de los ajustes a la pantalla desde la que se abrieron. */
  closeSettings(): void {
    this.show(this.settingsReturn);
  }

  /** Datos de la pantalla de resultado. */
  setResult(title: string, time: string, withAids: boolean): void {
    this.resultTitle.textContent = title;
    this.screens.result.setAttribute('aria-label', title);
    this.resultTime.textContent = TEXTS.result.time(time);
    setHidden(this.resultAids, !withAids);
  }

  private buildResult(): HTMLElement {
    return el('section', { className: 'screen screen-result' }, [
      this.resultTitle,
      this.resultTime,
      this.resultAids,
      el('div', { className: 'menu-buttons' }, [
        button(
          TEXTS.result.replay,
          () => {
            this.callbacks.onReplay();
          },
          'btn btn-primary',
        ),
        button(TEXTS.result.home, () => {
          this.callbacks.onHome();
        }),
      ]),
    ]);
  }

  /** Refleja en los controles unos ajustes ya validados. */
  setSettings(settings: Settings): void {
    const c = this.controls;
    c.sensitivity.value = String(settings.sensitivity);
    c.sensitivityValue.textContent = settings.sensitivity.toFixed(1);
    c.fov.value = String(settings.fov);
    c.fovValue.textContent = `${settings.fov}°`;
    c.quality.value = settings.quality;
    c.invertY.checked = settings.invertY;
    c.muted.checked = settings.muted;
    c.reduceMotion.checked = settings.reduceMotion;
  }

  private buildStart(): HTMLElement {
    const howTo = el(
      'ul',
      { className: 'how-to' },
      TEXTS.start.howTo.map((line) => el('li', { text: line })),
    );
    return el(
      'section',
      { className: 'screen screen-start', attrs: { 'aria-labelledby': 'title' } },
      [
        el('h1', { className: 'title', text: TEXTS.title, attrs: { id: 'title' } }),
        el('p', { className: 'tagline', text: TEXTS.tagline }),
        el('div', { className: 'menu-buttons' }, [
          button(
            TEXTS.start.play,
            () => {
              this.callbacks.onPlay();
            },
            'btn btn-primary',
          ),
          button(TEXTS.start.settings, () => {
            this.openSettings('start');
          }),
        ]),
        el('p', { className: 'content-note', text: TEXTS.contentNote }),
        el('h2', { className: 'how-to-title', text: TEXTS.start.howToTitle }),
        howTo,
      ],
    );
  }

  private buildPause(): HTMLElement {
    return el(
      'section',
      { className: 'screen screen-pause', attrs: { 'aria-label': TEXTS.pause.title } },
      [
        el('h2', { className: 'screen-title', text: TEXTS.pause.title }),
        this.pauseHint,
        el('div', { className: 'menu-buttons' }, [
          button(
            TEXTS.pause.resume,
            () => {
              this.callbacks.onResume();
            },
            'btn btn-primary',
          ),
          button(TEXTS.pause.settings, () => {
            this.openSettings('pause');
          }),
        ]),
      ],
    );
  }

  private buildSettings(): HTMLElement {
    const t = TEXTS.settings;
    const range = (id: string, min: number, max: number, step: number): HTMLInputElement =>
      el('input', {
        className: 'range',
        attrs: { id, type: 'range', min: String(min), max: String(max), step: String(step) },
      });
    const check = (id: string): HTMLInputElement =>
      el('input', { className: 'check', attrs: { id, type: 'checkbox' } });

    const { sensitivity: sr, fov: fr } = SETTINGS_RANGES;
    const sensitivity = range('set-sensitivity', sr.min, sr.max, sr.step);
    const fov = range('set-fov', fr.min, fr.max, fr.step);
    const quality = el('select', { className: 'select', attrs: { id: 'set-quality' } });
    for (const q of QUALITIES) {
      quality.appendChild(el('option', { text: t.qualityNames[q], attrs: { value: q } }));
    }
    this.controls = {
      sensitivity,
      sensitivityValue: el('output', { attrs: { for: 'set-sensitivity' } }),
      fov,
      fovValue: el('output', { attrs: { for: 'set-fov' } }),
      quality,
      invertY: check('set-invert'),
      muted: check('set-muted'),
      reduceMotion: check('set-reduce'),
    };
    const c = this.controls;
    const row = (
      label: string,
      id: string,
      control: HTMLElement,
      extra?: HTMLElement,
    ): HTMLElement =>
      el('div', { className: 'setting-row' }, [
        el('label', { text: label, attrs: { for: id } }),
        control,
        ...(extra ? [extra] : []),
      ]);

    const emit = (): void => {
      this.callbacks.onSettingsChange(this.readControls());
    };
    for (const control of [sensitivity, fov]) control.addEventListener('input', emit);
    for (const control of [quality, c.invertY, c.muted, c.reduceMotion]) {
      control.addEventListener('change', emit);
    }

    return el(
      'section',
      { className: 'screen screen-settings', attrs: { 'aria-label': t.title } },
      [
        el('h2', { className: 'screen-title', text: t.title }),
        row(t.sensitivity, 'set-sensitivity', sensitivity, c.sensitivityValue),
        row(t.invertY, 'set-invert', c.invertY),
        row(t.fov, 'set-fov', fov, c.fovValue),
        row(t.quality, 'set-quality', quality),
        row(t.muted, 'set-muted', c.muted),
        row(t.reduceMotion, 'set-reduce', c.reduceMotion),
        el('div', { className: 'menu-buttons' }, [
          button(t.back, () => {
            this.closeSettings();
          }),
        ]),
      ],
    );
  }

  private readControls(): Settings {
    const c = this.controls;
    return {
      sensitivity: c.sensitivity.valueAsNumber,
      fov: c.fov.valueAsNumber,
      quality: c.quality.value as Quality,
      invertY: c.invertY.checked,
      muted: c.muted.checked,
      reduceMotion: c.reduceMotion.checked,
    };
  }
}
