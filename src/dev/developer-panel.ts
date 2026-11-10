export interface DeveloperJump {
  label: string;
  enabled: () => boolean;
  run: () => boolean;
}

const PANEL_STYLE = `
.developer-panel { position:fixed; z-index:9; right:14px; bottom:14px; display:grid; width:min(230px,calc(100vw - 28px)); gap:6px; padding:9px; border:1px solid rgb(166 200 235 / 45%); border-radius:7px; background:rgb(13 24 34 / 82%); box-shadow:0 4px 16px rgb(0 0 0 / 24%); color:#d8ecff; font-size:11px; }
.developer-panel strong { color:#b9dcff; font-size:12px; }
.developer-panel span { color:#9cb4c8; }
.developer-panel button { border:1px solid rgb(174 212 244 / 45%); border-radius:4px; padding:6px 8px; background:rgb(42 69 88 / 90%); color:#eef7ff; cursor:pointer; font:inherit; text-align:left; }
.developer-panel button:disabled { cursor:default; opacity:.42; }
.developer-panel button:not(:disabled):hover, .developer-panel button:not(:disabled):focus-visible { background:#356b88; outline:1px solid #b9dcff; }
`;

/** UI local de Vite: no se monta ni se incluye desde la entrada de producción. */
export class DeveloperPanel {
  private readonly buttons: HTMLButtonElement[];

  constructor(parent: HTMLElement, jumps: readonly DeveloperJump[]) {
    const style = document.createElement('style');
    style.textContent = PANEL_STYLE;
    document.head.appendChild(style);
    const panel = document.createElement('aside');
    panel.className = 'developer-panel';
    panel.setAttribute('aria-label', 'Modo desarrollador');
    panel.innerHTML = '<strong>Desarrollo</strong><span>Saltos de prueba</span>';
    this.buttons = jumps.map((jump) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = jump.label;
      button.addEventListener('click', () => {
        if (!jump.enabled()) return;
        button.disabled = true;
        jump.run();
        this.refresh();
      });
      panel.appendChild(button);
      return button;
    });
    parent.appendChild(panel);
    this.refresh = () => this.buttons.forEach((button, index) => { button.disabled = !jumps[index].enabled(); });
  }

  refresh = (): void => {};
}
