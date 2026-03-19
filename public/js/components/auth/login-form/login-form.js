const base = new URL('.', import.meta.url).href;
const [htmlRes, cssRes] = await Promise.all([
  fetch(`${base}login-form.html`),
  fetch(`${base}login-form.css`),
]);
const TEMPLATE = await htmlRes.text();
const STYLES = await cssRes.text();

class LoginForm extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `<style>${STYLES}</style>${TEMPLATE}`;

    this.shadowRoot.getElementById('login-form').addEventListener('submit', (e) => this.handleSubmit(e));
    const oauthBtns = Array.from(this.shadowRoot.querySelectorAll('.oauth-btn'));
    oauthBtns.forEach((btn) => {
      const provider = btn.getAttribute('data-provider');
      if (provider) {
        btn.addEventListener('click', () => {
          window.location.href = `/api/auth/${provider}`;
        });
      }
    });
  }

  async handleSubmit(e) {
    e.preventDefault();
    const email = this.shadowRoot.getElementById('email').value;
    const password = this.shadowRoot.getElementById('password').value;
    const errorEl = this.shadowRoot.getElementById('error');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.hash = '#/dashboard';
      window.dispatchEvent(new CustomEvent('auth-changed'));
    } catch (error) {
      errorEl.textContent = error.message;
      errorEl.classList.remove('hidden');
    }
  }
}

customElements.define('login-form', LoginForm);
