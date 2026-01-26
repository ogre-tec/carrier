import '../../shared/json-editor/json-editor.js';

const base = new URL('.', import.meta.url).href;
const [htmlRes, cssRes] = await Promise.all([
  fetch(`${base}env-manager.html`),
  fetch(`${base}env-manager.css`),
]);
const TEMPLATE = await htmlRes.text();
const STYLES = await cssRes.text();

class EnvManager extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.environments = [];
    this._editingEnvId = null;
  }

  connectedCallback() {
    this.render();
  }

  setEnvironments(environments) {
    this.environments = environments;
    this.renderEnvironments();
  }

  render() {
    this.shadowRoot.innerHTML = `<style>${STYLES}</style>${TEMPLATE}`;

    this.shadowRoot.getElementById('new-env-btn').addEventListener('click', () => {
      const editor = this.shadowRoot.getElementById('env-vars-editor');
      editor.value = {};
      this.shadowRoot.getElementById('new-env-modal').open();
    });

    this.shadowRoot.getElementById('cancel-btn').addEventListener('click', () => {
      this.shadowRoot.getElementById('new-env-modal').close();
    });

    this.shadowRoot.getElementById('create-btn').addEventListener('click', () => {
      this.createEnvironment();
    });

    this.shadowRoot.getElementById('edit-cancel-btn').addEventListener('click', () => {
      this.shadowRoot.getElementById('edit-env-modal').close();
      this._editingEnvId = null;
    });

    this.shadowRoot.getElementById('edit-save-btn').addEventListener('click', () => {
      this.saveEnvironmentVariables();
    });
  }

  renderEnvironments() {
    const container = this.shadowRoot.getElementById('env-list');

    if (this.environments.length === 0) {
      container.innerHTML = `
        <div class="card text-center">
          <p style="color: var(--text-muted);">No environments yet. Create one to get started.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.environments.map(env => {
      const vars = this.parseVariables(env.variables);
      const entries = Object.entries(vars);

      return `
        <div class="env-item" data-id="${env.id}">
          <div class="env-header">
            <div>
              <span class="env-name">${this.escapeHtml(env.name)}</span>
              <span class="status status-${env.status}">${env.status}</span>
              ${env.port ? `<span style="margin-left: 8px; color: var(--text-muted);">Port: ${env.port}</span>` : ''}
            </div>
            <div class="env-actions">
              ${env.status === 'running' ? `
                <button class="btn btn-secondary btn-sm stop-btn" data-id="${env.id}">Stop</button>
                <button class="btn btn-secondary btn-sm restart-btn" data-id="${env.id}">Restart</button>
              ` : `
                <button class="btn btn-success btn-sm start-btn" data-id="${env.id}">Start</button>
              `}
              <button class="btn btn-secondary btn-sm edit-vars-btn" data-id="${env.id}">Edit Vars</button>
              <button class="btn btn-secondary btn-sm logs-btn" data-id="${env.id}">Logs</button>
              <button class="btn btn-danger btn-sm delete-btn" data-id="${env.id}">Delete</button>
            </div>
          </div>
          <div class="env-vars-display">
            ${entries.length === 0 ? `
              <div class="no-vars">No environment variables defined</div>
            ` : `
              <table class="vars-table">
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  ${entries.map(([key, value]) => `
                    <tr>
                      <td class="var-key">${this.escapeHtml(key)}</td>
                      <td class="var-value">${this.escapeHtml(this.maskValue(String(value)))}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>
        </div>
      `;
    }).join('');

    // Add event listeners
    container.querySelectorAll('.start-btn').forEach(btn => {
      btn.addEventListener('click', () => this.startEnvironment(btn.dataset.id));
    });

    container.querySelectorAll('.stop-btn').forEach(btn => {
      btn.addEventListener('click', () => this.stopEnvironment(btn.dataset.id));
    });

    container.querySelectorAll('.restart-btn').forEach(btn => {
      btn.addEventListener('click', () => this.restartEnvironment(btn.dataset.id));
    });

    container.querySelectorAll('.logs-btn').forEach(btn => {
      btn.addEventListener('click', () => this.showLogs(btn.dataset.id));
    });

    container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => this.deleteEnvironment(btn.dataset.id));
    });

    container.querySelectorAll('.edit-vars-btn').forEach(btn => {
      btn.addEventListener('click', () => this.openEditModal(btn.dataset.id));
    });
  }

  async createEnvironment() {
    const appId = this.getAttribute('app-id');
    const token = localStorage.getItem('token');
    const errorEl = this.shadowRoot.getElementById('form-error');
    const editor = this.shadowRoot.getElementById('env-vars-editor');

    const variables = editor.getValue();

    const data = {
      name: this.shadowRoot.getElementById('env-name').value,
      applicationId: appId,
      variables,
    };

    try {
      const response = await fetch('/api/environments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to create environment');
      }

      const newEnv = await response.json();
      this.environments.push(newEnv);
      this.shadowRoot.getElementById('new-env-modal').close();
      this.shadowRoot.getElementById('new-env-form').reset();
      editor.value = {};
      this.renderEnvironments();
    } catch (error) {
      errorEl.textContent = error.message;
      errorEl.classList.remove('hidden');
    }
  }

  openEditModal(envId) {
    const env = this.environments.find(e => e.id === envId);
    if (!env) return;

    this._editingEnvId = envId;
    const editor = this.shadowRoot.getElementById('edit-vars-editor');
    editor.value = this.parseVariables(env.variables);

    const modal = this.shadowRoot.getElementById('edit-env-modal');
    modal.setAttribute('title', `Edit Variables: ${env.name}`);
    modal.open();
  }

  async saveEnvironmentVariables() {
    if (!this._editingEnvId) return;

    const token = localStorage.getItem('token');
    const errorEl = this.shadowRoot.getElementById('edit-form-error');
    const editor = this.shadowRoot.getElementById('edit-vars-editor');

    const variables = editor.getValue();

    try {
      const response = await fetch(`/api/environments/${this._editingEnvId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ variables }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to update environment');
      }

      const updatedEnv = await response.json();
      const index = this.environments.findIndex(e => e.id === this._editingEnvId);
      if (index !== -1) {
        this.environments[index] = updatedEnv;
      }

      this.shadowRoot.getElementById('edit-env-modal').close();
      this._editingEnvId = null;
      this.renderEnvironments();
    } catch (error) {
      errorEl.textContent = error.message;
      errorEl.classList.remove('hidden');
    }
  }

  parseVariables(variables) {
    if (!variables) return {};
    if (typeof variables === 'object') return variables;
    try {
      return JSON.parse(variables);
    } catch {
      return {};
    }
  }

  maskValue(value) {
    if (!value || value.length <= 4) return value;
    const visible = Math.min(4, Math.floor(value.length / 4));
    return value.substring(0, visible) + '*'.repeat(Math.min(8, value.length - visible));
  }

  async startEnvironment(id) {
    const token = localStorage.getItem('token');
    try {
      await fetch(`/api/environments/${id}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      this.reloadEnvironments();
    } catch (error) {
      alert('Failed to start environment');
    }
  }

  async stopEnvironment(id) {
    const token = localStorage.getItem('token');
    try {
      await fetch(`/api/environments/${id}/stop`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      this.reloadEnvironments();
    } catch (error) {
      alert('Failed to stop environment');
    }
  }

  async restartEnvironment(id) {
    const token = localStorage.getItem('token');
    try {
      await fetch(`/api/environments/${id}/restart`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      this.reloadEnvironments();
    } catch (error) {
      alert('Failed to restart environment');
    }
  }

  showLogs(id) {
    window.location.hash = `#/logs/${id}`;
  }

  async deleteEnvironment(id) {
    if (!confirm('Are you sure you want to delete this environment?')) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/environments/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete');
      }

      this.environments = this.environments.filter(e => e.id !== id);
      this.renderEnvironments();
    } catch (error) {
      alert(error.message);
    }
  }

  async reloadEnvironments() {
    const appId = this.getAttribute('app-id');
    const token = localStorage.getItem('token');

    const res = await fetch(`/api/environments?applicationId=${appId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    this.environments = await res.json();
    this.renderEnvironments();
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('env-manager', EnvManager);
