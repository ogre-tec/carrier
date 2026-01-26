const base = new URL('.', import.meta.url).href;
const [htmlRes, cssRes] = await Promise.all([
  fetch(`${base}modal-dialog.html`),
  fetch(`${base}modal-dialog.css`),
]);
const TEMPLATE = await htmlRes.text();
const STYLES = await cssRes.text();

class ModalDialog extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['title', 'open'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name) {
    if (name === 'title') {
      const titleEl = this.shadowRoot.getElementById('modal-title');
      if (titleEl) titleEl.textContent = this.getAttribute('title') || 'Modal';
    }
    // 'open' attribute is handled by CSS :host([open])
  }

  render() {
    this.shadowRoot.innerHTML = `<style>${STYLES}</style>${TEMPLATE}`;

    this.shadowRoot.getElementById('modal-title').textContent =
      this.getAttribute('title') || 'Modal';

    this.shadowRoot.getElementById('close-btn').addEventListener('click', () => {
      this.close();
    });

    this.shadowRoot.querySelector('.modal-overlay').addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        this.close();
      }
    });
  }

  open() {
    this.setAttribute('open', '');
    this.dispatchEvent(new CustomEvent('modal-open'));
  }

  close() {
    this.removeAttribute('open');
    this.dispatchEvent(new CustomEvent('modal-close'));
  }
}

customElements.define('modal-dialog', ModalDialog);
