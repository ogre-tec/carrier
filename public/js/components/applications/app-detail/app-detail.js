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
          <button class="btn btn-secondary btn-sm" id="edit-btn">Edit</button>
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
          <form id="edit-app-form">
            <div class="form-group mt-4">
              <label class="form-label">Name</label>
              <input type="text" class="form-input" id="edit-name" value="${this.escapeHtml(app.name)}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea class="form-input" id="edit-description" rows="3">${this.escapeHtml(app.description || '')}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Type</label>
              <select class="form-input form-select" id="edit-type">
                <option value="repository" ${app.type === 'repository' ? 'selected' : ''}>Repository</option>
                <option value="binary"     ${app.type === 'binary'     ? 'selected' : ''}>Binary</option>
                <option value="docker"     ${app.type === 'docker'     ? 'selected' : ''}>Docker</option>
              </select>
            </div>

            <div class="form-group" id="edit-docker-image-group">
              <label class="form-label">Docker Image</label>
              <input type="text" class="form-input" id="edit-docker-image" value="${this.escapeHtml(app.dockerImage || '')}" placeholder="nginx:latest">
            </div>
            <div class="form-group" id="edit-docker-restart-group">
              <label class="form-label">Restart Policy</label>
              <select class="form-input form-select" id="edit-docker-restart">
                <option value="no"             ${app.dockerRestartPolicy === 'no'             ? 'selected' : ''}>No</option>
                <option value="unless-stopped" ${app.dockerRestartPolicy === 'unless-stopped' ? 'selected' : ''}>Unless Stopped</option>
                <option value="always"         ${app.dockerRestartPolicy === 'always'         ? 'selected' : ''}>Always</option>
                <option value="on-failure"     ${app.dockerRestartPolicy === 'on-failure'     ? 'selected' : ''}>On Failure</option>
              </select>
            </div>
            <div class="form-group" id="edit-docker-retries-group">
              <label class="form-label">Max Retries</label>
              <input type="number" class="form-input" id="edit-docker-retries" min="1" value="${app.dockerMaxRetries ?? ''}">
            </div>

            <div class="form-group" id="edit-repo-url-group">
              <label class="form-label">Repository URL</label>
              <input type="url" class="form-input" id="edit-repo-url" value="${this.escapeHtml(app.repositoryUrl || '')}">
            </div>
            <div class="form-group" id="edit-ssh-key-group">
              <label class="form-label">Public SSH Key</label>
              <textarea class="form-input" id="edit-ssh-key" rows="3">${this.escapeHtml(app.publicSSHKey || '')}</textarea>
            </div>
            <div class="form-group" id="edit-install-cmd-group">
              <label class="form-label">Install Dependencies Command</label>
              <input type="text" class="form-input" id="edit-install-cmd" value="${this.escapeHtml(app.dependenciesInstall || '')}" placeholder="npm install">
            </div>
            <div class="form-group" id="edit-build-cmd-group">
              <label class="form-label">Build Command</label>
              <input type="text" class="form-input" id="edit-build-cmd" value="${this.escapeHtml(app.buildCommand || '')}" placeholder="npm run build">
            </div>
            <div class="form-group" id="edit-start-cmd-group">
              <label class="form-label">Start Command</label>
              <input type="text" class="form-input" id="edit-start-cmd" value="${this.escapeHtml(app.startCommand || '')}" placeholder="npm start">
            </div>

            <div class="error-message hidden" id="edit-error"></div>
            <div style="display:flex; justify-content:flex-end; margin-top:16px;">
              <button type="submit" class="btn btn-primary">Save Changes</button>
            </div>
          </form>
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

    // Edit button — activate the Settings tab
    content.querySelector('#edit-btn').addEventListener('click', () => {
      content.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      content.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      content.querySelector('.tab[data-tab="settings"]').classList.add('active');
      content.querySelector('#tab-settings').classList.add('active');
    });

    // Settings form — initial field visibility
    this.updateEditVisibility(content, app.type, app.dockerRestartPolicy);

    content.querySelector('#edit-type').addEventListener('change', (e) => {
      this.updateEditVisibility(content, e.target.value, content.querySelector('#edit-docker-restart').value);
    });

    content.querySelector('#edit-docker-restart').addEventListener('change', (e) => {
      const show = e.target.value === 'on-failure';
      content.querySelector('#edit-docker-retries-group').style.display = show ? 'block' : 'none';
    });

    content.querySelector('#edit-app-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.saveApplication(content, app.id);
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

  updateEditVisibility(content, type, restartPolicy) {
    const show = (id) => content.querySelector(`#${id}`).style.display = 'block';
    const hide = (id) => content.querySelector(`#${id}`).style.display = 'none';

    const isDocker = type === 'docker';
    const isRepo   = type === 'repository';

    isDocker ? show('edit-docker-image-group')   : hide('edit-docker-image-group');
    isDocker ? show('edit-docker-restart-group') : hide('edit-docker-restart-group');
    (isDocker && restartPolicy === 'on-failure') ? show('edit-docker-retries-group') : hide('edit-docker-retries-group');
    isRepo   ? show('edit-repo-url-group')  : hide('edit-repo-url-group');
    isDocker ? hide('edit-ssh-key-group')   : show('edit-ssh-key-group');
    isDocker ? hide('edit-install-cmd-group') : show('edit-install-cmd-group');
    isDocker ? hide('edit-build-cmd-group') : show('edit-build-cmd-group');
    isDocker ? hide('edit-start-cmd-group') : show('edit-start-cmd-group');
  }

  async saveApplication(content, appId) {
    const token = localStorage.getItem('token');
    const errorEl = content.querySelector('#edit-error');
    const type = content.querySelector('#edit-type').value;
    const restartPolicy = content.querySelector('#edit-docker-restart').value;

    const data = {
      name:               content.querySelector('#edit-name').value,
      description:        content.querySelector('#edit-description').value || undefined,
      type,
      repositoryUrl:      content.querySelector('#edit-repo-url').value || undefined,
      publicSSHKey:       content.querySelector('#edit-ssh-key').value || undefined,
      dockerImage:        type === 'docker' ? content.querySelector('#edit-docker-image').value || undefined : undefined,
      dockerRestartPolicy: type === 'docker' ? restartPolicy : undefined,
      dockerMaxRetries:   (type === 'docker' && restartPolicy === 'on-failure')
                            ? parseInt(content.querySelector('#edit-docker-retries').value, 10) || undefined
                            : undefined,
      dependenciesInstall: content.querySelector('#edit-install-cmd').value || undefined,
      buildCommand:       content.querySelector('#edit-build-cmd').value || undefined,
      startCommand:       type !== 'docker' ? content.querySelector('#edit-start-cmd').value || undefined : undefined,
    };

    const submitBtn = content.querySelector('#edit-app-form button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.message || 'Failed to save');
      }

      this.application = await res.json();
      errorEl.classList.add('hidden');
    } catch (error) {
      errorEl.textContent = error.message;
      errorEl.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('app-detail', AppDetail);
