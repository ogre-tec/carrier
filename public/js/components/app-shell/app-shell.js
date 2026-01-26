const base = new URL('.', import.meta.url).href;
const [htmlRes, cssRes] = await Promise.all([
  fetch(`${base}app-shell.html`),
  fetch(`${base}app-shell.css`),
]);
const TEMPLATE = await htmlRes.text();
const STYLES = await cssRes.text();

class AppShell extends HTMLElement {

  contentMarkup = '';

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    // Check for OAuth token in URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('token', token);
      this.loadUserProfile(token);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    this.render();
    window.addEventListener('hashchange', () => this.route());
    window.addEventListener('auth-changed', () => this.render());
    this.route();
  }

  async loadUserProfile(token) {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const user = await res.json();
        localStorage.setItem('user', JSON.stringify(user));
        window.dispatchEvent(new CustomEvent('auth-changed'));
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  }

  render() {
    this.shadowRoot.innerHTML = `<style>${STYLES}</style>${TEMPLATE}`;
  }

  route() {
    const hash = window.location.hash || '#/';
    const main = this.shadowRoot.getElementById('main');
    const token = localStorage.getItem('token');

    // Parse route
    const [, path, id] = hash.match(/#\/([^/]*)(?:\/(.*))?/) || [null, '', null];

    // Root path: show login for unauthenticated, dashboard for authenticated
    if (path === '' || path === 'login') {
      if (token) {
        window.location.hash = '#/dashboard';
        return;
      }
      main.innerHTML = '<login-form></login-form>';
      return;
    }

    if (path === 'register') {
      if (token) {
        window.location.hash = '#/dashboard';
        return;
      }
      main.innerHTML = '<register-form></register-form>';
      return;
    }

    // Protected routes require authentication
    if (!token) {
      window.location.hash = '#/';
      return;
    }

    let target = '';
    // Route handling
    switch (path) {
      case 'dashboard':
        target = '<app-dashboard></app-dashboard>';
        break;

      case 'applications':
        if (id) {
          target = `<app-detail app-id="${id}"></app-detail>`;
        } else {
          target = '<app-dashboard></app-dashboard>';
        }
        break;

      case 'logs':
        if (id) {
          target = `<app-logs environment-id="${id}"></app-logs>`;
        } else {
          window.location.hash = '#/dashboard';
        }
        break;

      default:
        target = `
          <div class="container" style="padding: 40px 0; text-align: center;">
            <h1>404 - Page Not Found</h1>
            <p style="margin-top: 16px; color: var(--text-muted);">The page you're looking for doesn't exist.</p>
            <a href="#/dashboard" class="btn btn-primary" style="margin-top: 24px;">Go to Dashboard</a>
          </div>
        `;
        break;
    }
    this.contentMarkup = target;
    setTimeout(() => {
      const main = this.shadowRoot.getElementById('main');
      main.innerHTML = this.contentMarkup;
    }, 1000)
  }
}

customElements.define('app-shell', AppShell);
