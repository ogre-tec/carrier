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
      this.updateFormVisibility(e.target.value);
    });

    this.shadowRoot.getElementById('app-docker-restart').addEventListener('change', (e) => {
      const show = e.target.value === 'on-failure';
      this.shadowRoot.getElementById('docker-max-retries-group').style.display = show ? 'block' : 'none';
    });
  }

  updateFormVisibility(type) {
    const show = (id) => this.shadowRoot.getElementById(id).style.display = 'block';
    const hide = (id) => this.shadowRoot.getElementById(id).style.display = 'none';

    const isDocker = type === 'docker';
    const isRepo = type === 'repository';
    const isBinary = type === 'binary';

    isDocker ? show('docker-image-group')   : hide('docker-image-group');
    isDocker ? show('docker-restart-group') : hide('docker-restart-group');
    if (!isDocker) hide('docker-max-retries-group');
    isRepo   ? show('repo-url-group')     : hide('repo-url-group');
    isDocker ? hide('start-cmd-group')    : show('start-cmd-group');
    isDocker ? hide('ssh-key-group')      : show('ssh-key-group');
    isDocker ? hide('install-cmd-group')  : show('install-cmd-group');
    isDocker ? hide('build-cmd-group')    : show('build-cmd-group');
    isBinary ? hide('ssh-key-group') : {};
    isBinary ? hide('install-cmd-group') : {};
    isBinary ? hide('build-cmd-group') : {};
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

    const type = this.shadowRoot.getElementById('app-type').value;
    const data = {
      name: this.shadowRoot.getElementById('app-name').value,
      description: this.shadowRoot.getElementById('app-description').value,
      type,
      repositoryUrl: this.shadowRoot.getElementById('app-repo-url').value || undefined,
      publicSSHKey: this.shadowRoot.getElementById('app-public-ssh-key').value || undefined,
      dockerImage: this.shadowRoot.getElementById('app-docker-image').value || undefined,
      dockerRestartPolicy: type === 'docker' ? this.shadowRoot.getElementById('app-docker-restart').value : undefined,
      dockerMaxRetries: type === 'docker' && this.shadowRoot.getElementById('app-docker-restart').value === 'on-failure'
        ? parseInt(this.shadowRoot.getElementById('app-docker-max-retries').value, 10) || undefined
        : undefined,
      dependenciesInstall: this.shadowRoot.getElementById('app-install-cmd').value || undefined,
      buildCommand: this.shadowRoot.getElementById('app-build-cmd').value || undefined,
      startCommand: this.shadowRoot.getElementById('app-start-cmd').value,
      exposeViaProxy: this.shadowRoot.getElementById('app-expose-proxy').checked,
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
