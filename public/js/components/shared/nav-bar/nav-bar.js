const base = new URL('.', import.meta.url).href;
const [htmlRes, cssRes] = await Promise.all([
  fetch(`${base}nav-bar.html`),
  fetch(`${base}nav-bar.css`),
]);
const TEMPLATE = await htmlRes.text();
const STYLES = await cssRes.text();

class NavBar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const brandHref = user ? '#/dashboard' : '#/';

    this.shadowRoot.innerHTML = `<style>${STYLES}</style>${TEMPLATE}`;
    this.shadowRoot.getElementById('brand-link').href = brandHref;

    const navActions = this.shadowRoot.getElementById('nav-actions');
    if (user) {
      navActions.innerHTML = `
        <span class="nav-link">${user.name}</span>
        <button class="btn btn-secondary btn-sm" id="logout-btn">Logout</button>
      `;
      navActions.querySelector('#logout-btn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.hash = '#/';
        this.render();
      });
    } else {
      navActions.innerHTML = `
        <a href="#/" class="nav-link">Login</a>
        <a href="#/register" class="btn btn-primary btn-sm">Sign up</a>
      `;
    }
  }
}

customElements.define('nav-bar', NavBar);
