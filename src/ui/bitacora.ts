import type { DiscoverableDefinition } from '../game/narrative/discoverables';

type BitacoraEntry = Pick<DiscoverableDefinition, 'title' | 'text'>;

export class Bitacora {
  private readonly detail = document.createElement('section');
  private readonly log = document.createElement('section');
  private readonly detailTitle: HTMLHeadingElement;
  private readonly detailText: HTMLParagraphElement;
  private readonly logContent: HTMLDivElement;

  constructor(app: HTMLElement, private readonly onClose: () => void) {
    this.detail.className = 'discoverable-card';
    this.detail.innerHTML = `
      <div class="discoverable-card__panel" role="dialog" aria-modal="true" aria-labelledby="discoverable-title">
        <strong>Hallazgo educativo</strong><h2 id="discoverable-title"></h2><p></p>
        <button type="button">Continuar</button>
      </div>`;
    this.log.className = 'bitacora';
    this.log.innerHTML = `
      <div class="bitacora__panel" role="dialog" aria-modal="true" aria-labelledby="bitacora-title">
        <strong>Bitácora</strong><h2 id="bitacora-title">Hallazgos</h2><div></div>
        <button type="button">Cerrar</button>
      </div>`;
    app.append(this.detail, this.log);
    this.detailTitle = this.detail.querySelector<HTMLHeadingElement>('h2')!;
    this.detailText = this.detail.querySelector<HTMLParagraphElement>('p')!;
    this.logContent = this.log.querySelector<HTMLDivElement>('.bitacora__panel div')!;
    this.detail.querySelector('button')?.addEventListener('click', () => this.close());
    this.log.querySelector('button')?.addEventListener('click', () => this.close());
  }

  get isOpen(): boolean { return this.detail.classList.contains('visible') || this.log.classList.contains('visible'); }

  showDiscoverable(item: DiscoverableDefinition): void {
    this.detailTitle.textContent = item.title;
    this.detailText.textContent = item.text;
    this.detail.classList.add('visible');
    queueMicrotask(() => this.detail.querySelector<HTMLButtonElement>('button')?.focus());
  }

  showLog(items: readonly BitacoraEntry[]): void {
    this.logContent.replaceChildren();
    if (items.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'Todavía no encontraste hallazgos. Explorá el entorno para descubrirlos.';
      this.logContent.append(empty);
    } else {
      items.forEach((item) => {
        const article = document.createElement('article');
        const title = document.createElement('h3');
        const text = document.createElement('p');
        title.textContent = item.title;
        text.textContent = item.text;
        article.append(title, text);
        this.logContent.append(article);
      });
    }
    this.log.classList.add('visible');
    queueMicrotask(() => this.log.querySelector<HTMLButtonElement>('button')?.focus());
  }

  close(): void {
    if (!this.isOpen) return;
    this.detail.classList.remove('visible');
    this.log.classList.remove('visible');
    this.onClose();
  }
}
