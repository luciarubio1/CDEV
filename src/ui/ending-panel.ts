/** Presentation only: no statistics, scoring or progression dependencies. */
export function configureAwarenessEnding(root: HTMLElement): void {
  root.classList.add('awareness-ending');
  root.querySelector('h1')!.textContent = 'Las llamas se apagaron. El cuidado continúa.';
  root.querySelector('.defeat-reflection')!.textContent = 'El incendio también afecta los refugios de la fauna, la vegetación y la vida de las comunidades. Contenerlo es solo una parte: prevenir y cuidar el entorno también importa.';
  root.querySelector<HTMLElement>('.impact-message')!.hidden = true;
  const list = root.querySelector<HTMLElement>('.awareness-ideas')!;
  list.replaceChildren();
  for (const [title, text] of [
    ['Prevenir', 'Nuestras acciones pueden reducir el riesgo de iniciar un incendio.'],
    ['Comprender', 'La sequía favorece la propagación; no es por sí sola una fuente de ignición.'],
    ['Cuidar', 'Ante fauna afectada, avisar al equipo especializado también es ayudar.'],
  ]) {
    const item = document.createElement('li');
    const heading = document.createElement('strong'); heading.textContent = title;
    const paragraph = document.createElement('span'); paragraph.textContent = text;
    item.append(heading, paragraph); list.append(item);
  }
  list.hidden = false;
  root.querySelector<HTMLElement>('.ending-credits')!.hidden = false;
  root.querySelector<HTMLElement>('.defeat-actions__menu')!.hidden = true;
  root.querySelector('.defeat-actions__retry')!.textContent = 'Volver a recorrer';
}
