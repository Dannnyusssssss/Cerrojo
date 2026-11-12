/**
 * Pantallas de menú: inicio (con nota de contenido), selección de sala, pausa, ajustes,
 * resultado y confirmación. Botones y controles nativos, manejables con Tab, flechas y Enter.
 */
import { QUALITIES, SETTINGS_RANGES, type Quality, type Settings } from '../data/config';
import { TEXTS } from '../data/texts';
import { button, el, setHidden } from './dom';
import { RoomSelect, type RoomEntry } from './room-select';

export type Screen = 'start' | 'rooms' | 'pause' | 'settings' | 'result' | 'confirm';

export interface MenuCallbacks {
  /** «Continuar» la partida guardada. */
  onContinue(): void;
  /** Sala elegida en la selección (índice en la lista de salas). */
  onChooseRoom(index: number): void;
  onResume(): void;
  /** Recibe los valores leídos de los controles; quien llama los valida y guarda. */
  onSettingsChange(values: Settings): void;
  /** Resultado: nueva partida con otra semilla en la misma sala. */
  onReplay(): void;
  onNextRoom(): void;
  /** Volver a la selección de salas (desde el resultado o la pausa). */
  onRooms(): void;
  /** Pausa: «Reiniciar sala» (ya confirmado). */
  onRestart(): void;
  /** Ajustes: «Borrar datos guardados» (ya confirmado). */
  onClearData(): void;
  /** Pausa: silenciar o activar el sonido. */
  onToggleMute(): void;
}

export class Menus {
  readonly root: HTMLDivElement;
  private readonly screens: Record<Screen, HTMLElement>;
  private readonly pauseHint: HTMLParagraphElement;
  private readonly resultTime: HTMLParagraphElement;
  private readonly resultAids: HTMLParagraphElement;
  private readonly resultHints: HTMLParagraphElement;
  private readonly resultTitle: HTMLHeadingElement;
  private readonly resultRecord: HTMLParagraphElement;
  private readonly nextButton: HTMLButtonElement;
  private readonly continueButton: HTMLButtonElement;
  private readonly clearButton: HTMLButtonElement;
  private readonly roomSelect: RoomSelect;
  private readonly confirmText: HTMLParagraphElement;
  private readonly startNotice: HTMLParagraphElement;
  private readonly muteButton: HTMLButtonElement;
  private confirmYes: () => void = () => undefined;
  private confirmReturn: Screen = 'start';
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
    volume: HTMLInputElement;
    volumeValue: HTMLOutputElement;
    reduceMotion: HTMLInputElement;
    showTimer: HTMLInputElement;
  };

  constructor(callbacks: MenuCallbacks) {
    this.callbacks = callbacks;
    this.pauseHint = el('p', { className: 'pause-hint', text: TEXTS.pause.clickToContinue });
    this.resultTime = el('p', { className: 'result-time' });
    this.resultAids = el('p', { className: 'pause-hint', text: TEXTS.result.withAids });
    this.resultTitle = el('h2', { className: 'screen-title' });
    this.resultHints = el('p', { className: 'result-hints' });
    this.resultRecord = el('p', { className: 'result-record', text: TEXTS.result.newRecord });
    this.nextButton = button(
      TEXTS.result.next,
      () => {
        callbacks.onNextRoom();
      },
      'btn btn-primary',
    );
    this.continueButton = button(
      '',
      () => {
        callbacks.onContinue();
      },
      'btn btn-primary',
    );
    this.clearButton = button(TEXTS.settings.clearData, () => {
      this.confirm(TEXTS.confirm.clearData, 'settings', () => {
        callbacks.onClearData();
        this.show('settings');
      });
    });
    this.roomSelect = new RoomSelect(
      (index) => {
        callbacks.onChooseRoom(index);
      },
      () => {
        this.show('start');
      },
    );
    this.confirmText = el('p', { className: 'confirm-text' });
    this.muteButton = button(TEXTS.pause.mute, () => {
      callbacks.onToggleMute();
    });
    this.startNotice = el('p', { className: 'start-notice', attrs: { role: 'status' } });
    setHidden(this.startNotice, true);
    this.screens = {
      start: this.buildStart(),
      rooms: this.roomSelect.root,
      pause: this.buildPause(),
      settings: this.buildSettings(),
      result: this.buildResult(),
      confirm: this.buildConfirm(),
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
      this.screens[screen]
        .querySelector<HTMLElement>('button:not([hidden]):not(:disabled), input, select')
        ?.focus();
    }
  }

  /** Esc en una pantalla secundaria del menú: vuelve atrás. Devuelve true si hizo algo. */
  back(): boolean {
    switch (this.current) {
      case 'settings':
        this.closeSettings();
        return true;
      case 'confirm':
        this.show(this.confirmReturn);
        return true;
      case 'rooms':
        this.show('start');
        return true;
      default:
        return false;
    }
  }

  openSettings(from: Screen): void {
    this.settingsReturn = from;
    // Borrar datos solo desde el inicio, con ninguna partida abierta.
    setHidden(this.clearButton, from !== 'start');
    this.show('settings');
  }

  /** Pide confirmar una acción; «No» vuelve a la pantalla `returnTo`. */
  confirm(text: string, returnTo: Screen, onYes: () => void): void {
    this.confirmText.textContent = text;
    this.confirmReturn = returnTo;
    this.confirmYes = onYes;
    this.show('confirm');
    // El foco empieza en «No»: un Enter de más no borra ni reinicia nada.
    this.screens.confirm.querySelector<HTMLElement>('.confirm-no')?.focus();
  }

  /** «Continuar» en el inicio: con el nombre de la sala guardada, o oculto con null. */
  setContinue(roomName: string | null): void {
    setHidden(this.continueButton, roomName === null);
    if (roomName !== null) this.continueButton.textContent = TEXTS.start.continueGame(roomName);
  }

  /** Aviso en el inicio (por ejemplo, una partida guardada que no se pudo recuperar). */
  setStartNotice(text: string | null): void {
    this.startNotice.textContent = text ?? '';
    setHidden(this.startNotice, text === null);
  }

  setRooms(entries: readonly RoomEntry[]): void {
    this.roomSelect.update(entries);
  }

  private buildConfirm(): HTMLElement {
    return el('section', { className: 'screen screen-confirm', attrs: { role: 'alertdialog' } }, [
      this.confirmText,
      el('div', { className: 'menu-buttons' }, [
        button(
          TEXTS.confirm.no,
          () => {
            this.show(this.confirmReturn);
          },
          'btn confirm-no',
        ),
        button(
          TEXTS.confirm.yes,
          () => {
            this.confirmYes();
          },
          'btn btn-primary',
        ),
      ]),
    ]);
  }

  /** Vuelve de los ajustes a la pantalla desde la que se abrieron. */
  closeSettings(): void {
    this.show(this.settingsReturn);
  }

  /** Datos de la pantalla de resultado. */
  setResult(
    title: string,
    time: string,
    hintsUsed: number,
    withAids: boolean,
    newRecord: boolean,
    hasNext: boolean,
  ): void {
    this.resultTitle.textContent = title;
    setHidden(this.resultRecord, !newRecord);
    setHidden(this.nextButton, !hasNext);
    this.screens.result.setAttribute('aria-label', title);
    this.resultTime.textContent = TEXTS.result.time(time);
    this.resultHints.textContent = TEXTS.result.hints(hintsUsed);
    setHidden(this.resultAids, !withAids);
  }

  private buildResult(): HTMLElement {
    return el('section', { className: 'screen screen-result' }, [
      this.resultTitle,
      this.resultTime,
      this.resultHints,
      this.resultRecord,
      this.resultAids,
      el('div', { className: 'menu-buttons' }, [
        this.nextButton,
        button(TEXTS.result.replay, () => {
          this.callbacks.onReplay();
        }),
        button(TEXTS.result.rooms, () => {
          this.callbacks.onRooms();
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
    this.muteButton.textContent = settings.muted ? TEXTS.pause.unmute : TEXTS.pause.mute;
    this.muteButton.setAttribute('aria-pressed', String(settings.muted));
    c.volume.value = String(settings.volume);
    c.volumeValue.textContent = `${Math.round(settings.volume * 100)} %`;
    c.reduceMotion.checked = settings.reduceMotion;
    c.showTimer.checked = settings.showTimer;
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
          this.continueButton,
          button(
            TEXTS.start.play,
            () => {
              this.show('rooms');
            },
            'btn btn-primary',
          ),
          button(TEXTS.start.settings, () => {
            this.openSettings('start');
          }),
        ]),
        this.startNotice,
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
          this.muteButton,
          button(TEXTS.pause.restart, () => {
            this.confirm(TEXTS.confirm.restart, 'pause', () => {
              this.callbacks.onRestart();
            });
          }),
          button(TEXTS.pause.rooms, () => {
            this.callbacks.onRooms();
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

    const { sensitivity: sr, fov: fr, volume: vr } = SETTINGS_RANGES;
    const sensitivity = range('set-sensitivity', sr.min, sr.max, sr.step);
    const fov = range('set-fov', fr.min, fr.max, fr.step);
    const volume = range('set-volume', vr.min, vr.max, vr.step);
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
      volume,
      volumeValue: el('output', { attrs: { for: 'set-volume' } }),
      reduceMotion: check('set-reduce'),
      showTimer: check('set-timer'),
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
    for (const control of [sensitivity, fov, volume]) control.addEventListener('input', emit);
    for (const control of [quality, c.invertY, c.muted, c.reduceMotion, c.showTimer]) {
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
        row(t.volume, 'set-volume', volume, c.volumeValue),
        row(t.reduceMotion, 'set-reduce', c.reduceMotion),
        row(t.showTimer, 'set-timer', c.showTimer),
        el('div', { className: 'menu-buttons' }, [
          button(t.back, () => {
            this.closeSettings();
          }),
          this.clearButton,
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
      volume: c.volume.valueAsNumber,
      reduceMotion: c.reduceMotion.checked,
      showTimer: c.showTimer.checked,
    };
  }
}
