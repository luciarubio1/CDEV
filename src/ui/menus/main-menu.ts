export interface MainMenuOptions {
  onStart: () => void;
  onResume: () => void;
}

const PROJECT_CREDITS = {
  name: 'PRIMERA LÍNEA',
  team: 'Grupo 8',
} as const;

const TEAM_MEMBERS = [
  {
    name: 'Federico Wedemeyer',
    role: 'Game Designer / Level Designer',
  },
  {
    name: 'Paula Chudnosky',
    role: 'Lead Programmer / Gameplay Programmer',
  },
  {
    name: 'Ignacio Salto',
    role: 'World Builder / Narrative Director',
  },
  {
    name: 'Lucia Rubio',
    role: 'Audio Director / AI Programmer',
  },
  {
    name: 'Belén Tapia',
    role: 'Art Director / Sound Designer',
  },
  {
    name: 'Juan Cruz Rodríguez Villafañe',
    role: 'Creative Director / Technical Director',
  },
  {
    name: 'Facundo de la Fuente',
    role: 'Producer / UX Designer',
  },
] as const;

type MenuPanel = 'main' | 'controls' | 'credits';

export class MainMenu {
  private readonly root = document.createElement('section');
  private readonly mainPanel = document.createElement('div');
  private readonly controlsPanel = document.createElement('div');
  private readonly creditsPanel = document.createElement('div');
  private readonly startButton = document.createElement('button');
  private isPauseMenu = false;
  private readonly options: MainMenuOptions;

  constructor(container: HTMLElement, options: MainMenuOptions) {
    this.options = options;
    this.root.className = 'main-menu';
    this.root.setAttribute('aria-label', 'Menú principal');

    this.mainPanel.className = 'main-menu__panel';
    this.mainPanel.append(
      this.createHeading(),
      this.createMainActions(),
    );

    this.controlsPanel.className = 'main-menu__panel main-menu__panel--detail';
    this.controlsPanel.append(this.createControlsContent());

    this.creditsPanel.className = 'main-menu__panel main-menu__panel--detail';
    this.creditsPanel.append(this.createCreditsContent());

    this.root.append(this.mainPanel, this.controlsPanel, this.creditsPanel);
    container.appendChild(this.root);
    this.showPanel('main');
  }

  hide(): void {
    this.root.classList.add('hidden');
  }

  showForPause(): void {
    this.isPauseMenu = true;
    this.startButton.textContent = 'Continuar experiencia';
    this.root.classList.remove('hidden');
    this.showPanel('main');
  }

  private createHeading(): HTMLElement {
    const heading = document.createElement('header');
    heading.className = 'main-menu__heading';
    heading.innerHTML = `
      <p>Experiencia inmersiva</p>
      <h1>PRIMERA LÍNEA</h1>
      <span>Una experiencia sobre incendios forestales en las Sierras de Córdoba.</span>
    `;
    return heading;
  }

  private createMainActions(): HTMLElement {
    const actions = document.createElement('div');
    actions.className = 'main-menu__actions';

    this.startButton.type = 'button';
    this.startButton.className = 'main-menu__button main-menu__button--primary';
    this.startButton.textContent = 'Iniciar experiencia';
    this.startButton.addEventListener('click', () => {
      this.hide();
      if (this.isPauseMenu) {
        this.isPauseMenu = false;
        this.startButton.textContent = 'Iniciar experiencia';
        this.options.onResume();
        return;
      }
      this.options.onStart();
    });

    const controlsButton = this.createActionButton('Controles', () =>
      this.showPanel('controls'),
    );
    const creditsButton = this.createActionButton('Créditos', () =>
      this.showPanel('credits'),
    );
    const restartButton = this.createActionButton('Reiniciar experiencia', () => window.location.reload());

    actions.append(this.startButton, controlsButton, creditsButton, restartButton);
    return actions;
  }

  private createControlsContent(): HTMLElement {
    const content = document.createElement('div');
    content.innerHTML = `
      <p class="main-menu__eyebrow">Antes de salir al terreno</p>
      <h2>Controles</h2>
      <dl class="main-menu__controls-list">
        <div><dt>WASD</dt><dd>Movimiento</dd></div>
        <div><dt>Mouse</dt><dd>Mirar</dd></div>
        <div><dt>F</dt><dd>Hablar e interactuar con objetos</dd></div>
        <div><dt>E</dt><dd>Usar la manguera</dd></div>
        <div><dt>R</dt><dd>Recargar agua cerca del camión</dd></div>
        <div><dt>M</dt><dd>Silenciar o activar audio</dd></div>
        <div><dt>ESC</dt><dd>Liberar el cursor</dd></div>
      </dl>
    `;
    content.append(this.createBackButton());
    return content;
  }

  private createCreditsContent(): HTMLElement {
    const content = document.createElement('div');
    const membersList = TEAM_MEMBERS.map(
      (member) => `
        <li>
          <strong>${member.name}</strong>
          <span>${member.role}</span>
        </li>`,
    ).join('');
    content.innerHTML = `
      <p class="main-menu__eyebrow">Créditos</p>
      <h2>${PROJECT_CREDITS.name}</h2>
      <p class="main-menu__team">${PROJECT_CREDITS.team}</p>
      <p class="main-menu__copy">Integrantes del equipo</p>
      <ul class="main-menu__credits-list">
        ${membersList}
      </ul>
    `;
    content.append(this.createBackButton());
    return content;
  }

  private createActionButton(
    label: string,
    onClick: () => void,
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'main-menu__button';
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  }

  private createBackButton(): HTMLButtonElement {
    const button = this.createActionButton('Volver', () =>
      this.showPanel('main'),
    );
    button.classList.add('main-menu__back');
    return button;
  }

  private showPanel(panel: MenuPanel): void {
    this.mainPanel.hidden = panel !== 'main';
    this.controlsPanel.hidden = panel !== 'controls';
    this.creditsPanel.hidden = panel !== 'credits';

    const focusTarget =
      panel === 'main'
        ? this.startButton
        : (panel === 'controls' ? this.controlsPanel : this.creditsPanel).querySelector<HTMLButtonElement>('button');
    queueMicrotask(() => focusTarget?.focus());
  }
}
