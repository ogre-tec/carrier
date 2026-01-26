const base = new URL('.', import.meta.url).href;
const [htmlRes, cssRes] = await Promise.all([
  fetch(`${base}app-card.html`),
  fetch(`${base}app-card.css`),
]);
const TEMPLATE = await htmlRes.text();
const STYLES = await cssRes.text();

class AppCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const id = this.getAttribute('app-id');
    const name = this.getAttribute('name');
    const description = this.getAttribute('description');
    const type = this.getAttribute('type');
    const created = this.getAttribute('created');

    this.shadowRoot.innerHTML = `<style>${STYLES}</style>${TEMPLATE}`;

    this.shadowRoot.getElementById('card-title').textContent = name;
    this.shadowRoot.getElementById('card-type').textContent = type;
    this.shadowRoot.getElementById('card-description').textContent = description || 'No description';
    this.shadowRoot.getElementById('card-date').textContent = `Created ${new Date(created).toLocaleDateString()}`;

    this.shadowRoot.getElementById('card').addEventListener('click', () => {
      window.location.hash = `#/applications/${id}`;
    });
  }
}

customElements.define('app-card', AppCard);
