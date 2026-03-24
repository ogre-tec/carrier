const base = new URL('.', import.meta.url).href;
const [htmlRes, cssRes] = await Promise.all([
  fetch(`${base}app-detail.html`),
  fetch(`${base}app-detail.css`),
]);
const TEMPLATE = await htmlRes.text();
const STYLES = await cssRes.text();

class AppDetail extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.application = null;
    this.environments = [];
  }

  static get observedAttributes() {
    return ['app-id'];
  }

  connectedCallback() {
    this.render();
    this.loadApplication();
  }

  attributeChangedCallback() {
    this.loadApplication();
  }

  render() {
    this.shadowRoot.innerHTML = `<style>${STYLES}</style>${TEMPLATE}`;
  }

  async loadApplication() {
    const appId = this.getAttribute('app-id');
    if (!appId) return;

    const token = localStorage.getItem('token');
    const content = this.shadowRoot.getElementById('content');

    try {
      const [appRes, envRes] = await Promise.all([
        fetch(`/api/applications/${appId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`/api/environments?applicationId=${appId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      if (!appRes.ok) throw new Error('Failed to load application');

      this.application = await appRes.json();
      this.environments = await envRes.json();
      this.renderApplication();
    } catch (error) {
      content.innerHTML = `
        <div class="card text-center">
          <p>Failed to load application. It may not exist or you don't have access.</p>
          <a href="#/dashboard" class="btn btn-primary mt-4">Back to Dashboard</a>
        </div>
      `;
    }
  }

  renderApplication() {
    const content = this.shadowRoot.getElementById('content');
    const app = this.application;

    content.innerHTML = `
      <div class="app-detail-header">
        <div>
          <h1>${this.escapeHtml(app.name)}</h1>
          <p style="color: var(--text-muted); margin-top: 8px;">${this.escapeHtml(app.description || 'No description')}</p>
        </div>
        <div>
          <!--
          <button class="btn btn-secondary btn-sm" id="edit-btn">Edit</button>
          -->
          <button class="btn btn-danger btn-sm" id="delete-btn">Delete</button>
        </div>
      </div>

      <div class="tabs">
        <button class="tab active" data-tab="environments">Environments</button>
        <button class="tab" data-tab="settings">Settings</button>
      </div>

      <div id="tab-environments" class="tab-content active">
        <env-manager app-id="${app.id}"></env-manager>
      </div>

      <div id="tab-settings" class="tab-content">
        <div class="card">
          <h3>Application Settings</h3>
          <div class="form-group mt-4">
            <label class="form-label">Type</label>
            <p>${app.type}</p>
          </div>
          ${app.repositoryUrl ? `
            <div class="form-group">
              <label class="form-label">Repository URL</label>
              <p>${this.escapeHtml(app.repositoryUrl)}</p>
            </div>
          ` : ''}
          ${app.dockerImage ? `
            <div class="form-group">
              <label class="form-label">Docker Image</label>
              <p>${this.escapeHtml(app.dockerImage)}</p>
            </div>
          ` : ''}
          <div class="form-group">
            <label class="form-label">Build Command</label>
            <p>${this.escapeHtml(app.buildCommand || 'None')}</p>
          </div>
          <div class="form-group">
            <label class="form-label">Start Command</label>
            <p>${this.escapeHtml(app.startCommand || 'None')}</p>
          </div>
        </div>
      </div>
    `;

    const envManager = content.querySelector('env-manager');
    envManager.setEnvironments(this.environments);

    // Tab switching
    content.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        content.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        content.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        content.querySelector(`#tab-${tab.dataset.tab}`).classList.add('active');
      });
    });

    // Delete button
    content.querySelector('#delete-btn').addEventListener('click', async () => {
      if (!confirm('Are you sure you want to delete this application?')) return;

      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`/api/applications/${app.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          window.location.hash = '#/dashboard';
        }
      } catch (error) {
        alert('Failed to delete application');
      }
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('app-detail', AppDetail);
