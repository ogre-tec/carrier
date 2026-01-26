const base = new URL('.', import.meta.url).href;
const [htmlRes, cssRes] = await Promise.all([
  fetch(`${base}app-dashboard.html`),
  fetch(`${base}app-dashboard.css`),
]);
const TEMPLATE = await htmlRes.text();
const STYLES = await cssRes.text();

class AppDashboard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.applications = [];
  }

  connectedCallback() {
    this.render();
    this.loadApplications();
  }

  render() {
    this.shadowRoot.innerHTML = `<style>${STYLES}</style>${TEMPLATE}`;

    this.shadowRoot.getElementById('new-app-btn').addEventListener('click', () => {
      this.shadowRoot.getElementById('new-app-modal').open();
    });

    this.shadowRoot.getElementById('cancel-btn').addEventListener('click', () => {
      this.shadowRoot.getElementById('new-app-modal').close();
    });

    this.shadowRoot.getElementById('create-btn').addEventListener('click', () => {
      this.createApplication();
    });

    this.shadowRoot.getElementById('app-type').addEventListener('change', (e) => {
      const repoGroup = this.shadowRoot.getElementById('repo-url-group');
      repoGroup.style.display = e.target.value === 'repository' ? 'block' : 'none';
    });
  }

  async loadApplications() {
    const token = localStorage.getItem('token');
    const content = this.shadowRoot.getElementById('content');

    try {
      const response = await fetch('/api/applications', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to load applications');
      }

      this.applications = await response.json();
      this.renderApplications();
    } catch (error) {
      content.innerHTML = `
        <div class="card text-center">
          <p>Failed to load applications. Please try again.</p>
          <button class="btn btn-primary mt-4" onclick="this.getRootNode().host.loadApplications()">Retry</button>
        </div>
      `;
      setTimeout(() => {
        localStorage.removeItem('token');
        window.location.href = '/';
      }, 1_000);
    }
  }

  renderApplications() {
    const content = this.shadowRoot.getElementById('content');

    if (this.applications.length === 0) {
      content.innerHTML = `
        <div class="card text-center">
          <h3>No applications yet</h3>
          <p class="mt-4" style="color: var(--text-muted);">
            Create your first application to get started.
          </p>
        </div>
      `;
      return;
    }

    content.innerHTML = `<app-list></app-list>`;
    const appList = content.querySelector('app-list');
    appList.setAttribute('applications', JSON.stringify(this.applications));
  }

  async createApplication() {
    const token = localStorage.getItem('token');
    const errorEl = this.shadowRoot.getElementById('form-error');

    const data = {
      name: this.shadowRoot.getElementById('app-name').value,
      description: this.shadowRoot.getElementById('app-description').value,
      type: this.shadowRoot.getElementById('app-type').value,
      repositoryUrl: this.shadowRoot.getElementById('app-repo-url').value,
      publicSSHKey: this.shadowRoot.getElementById('app-public-ssh-key').value,
      buildCommand: this.shadowRoot.getElementById('app-build-cmd').value,
      startCommand: this.shadowRoot.getElementById('app-start-cmd').value,
    };

    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to create application');
      }

      this.shadowRoot.getElementById('new-app-modal').close();
      this.shadowRoot.getElementById('new-app-form').reset();
      this.loadApplications();
    } catch (error) {
      errorEl.textContent = error.message;
      errorEl.classList.remove('hidden');
    }
  }
}

customElements.define('app-dashboard', AppDashboard);
