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

  getUnauthorizedContent(reason) {
    let data = {
      title: '',
      message: '',
    }
    switch (reason) {
      case '401':
        data = {
          title: 'Invalid account',
          message: 'Your account is not active, contact the adimistrator for support.',
        };
        break;
      default:
        data = {
          title: 'Session expired',
          message: 'Your session has expired or is no longer valid. Please log in again.',
        };
        break;
    }
    return `
      <div style="display:flex;align-items:center;justify-content:center;min-height:60vh;">
        <div style="text-align:center;max-width:360px;">
          <h2 style="margin-bottom:12px;">${data.title}</h2>
          <p style="color:#64748b;margin-bottom:24px;">${data.message}</p>
          <a href="#/" style="display:inline-flex;align-items:center;justify-content:center;padding:10px 24px;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none;font-weight:500;">Go to Login</a>
        </div>
      </div>
    `;
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

    if (path.startsWith('unauthorized-')) {
      main.innerHTML = this.getUnauthorizedContent(path.split('-')[1]);
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

      case 'admin': {
        const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
        if (!currentUser || currentUser.role !== 'admin') {
          window.location.hash = '#/dashboard';
          return;
        }
        target = '<user-management></user-management>';
        break;
      }

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
