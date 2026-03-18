const base = new URL('.', import.meta.url).href;
const [htmlRes, cssRes] = await Promise.all([
  fetch(`${base}register-form.html`),
  fetch(`${base}register-form.css`),
]);
const TEMPLATE = await htmlRes.text();
const STYLES = await cssRes.text();

class RegisterForm extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `<style>${STYLES}</style>${TEMPLATE}`;

    this.shadowRoot.getElementById('register-form').addEventListener('submit', (e) => this.handleSubmit(e));
    this.shadowRoot.getElementById('google-btn').addEventListener('click', () => {
      window.location.href = '/api/auth/google';
    });
    this.shadowRoot.getElementById('github-btn').addEventListener('click', () => {
      window.location.href = '/api/auth/github';
    });
  }

  async handleSubmit(e) {
    e.preventDefault();
    const name = this.shadowRoot.getElementById('name').value;
    const email = this.shadowRoot.getElementById('email').value;
    const password = this.shadowRoot.getElementById('password').value;
    const errorEl = this.shadowRoot.getElementById('error');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      if (!data.access_token) {
        window.location.hash = '#/login';
        return;
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

customElements.define('register-form', RegisterForm);
