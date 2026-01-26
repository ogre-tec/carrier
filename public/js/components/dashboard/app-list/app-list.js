const base = new URL('.', import.meta.url).href;
const [htmlRes, cssRes] = await Promise.all([
  fetch(`${base}app-list.html`),
  fetch(`${base}app-list.css`),
]);
const TEMPLATE = await htmlRes.text();
const STYLES = await cssRes.text();

class AppList extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['applications'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const applications = JSON.parse(this.getAttribute('applications') || '[]');

    this.shadowRoot.innerHTML = `<style>${STYLES}</style>${TEMPLATE}`;

    const grid = this.shadowRoot.getElementById('app-grid');
    grid.innerHTML = applications.map(app => `
      <app-card
        app-id="${app.id}"
        name="${this.escapeAttr(app.name)}"
        description="${this.escapeAttr(app.description || '')}"
        type="${app.type}"
        created="${app.createdAt}"
      ></app-card>
    `).join('');
  }

  escapeAttr(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('app-list', AppList);
