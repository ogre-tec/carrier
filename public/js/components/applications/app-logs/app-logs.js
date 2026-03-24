const base = new URL('.', import.meta.url).href;
const [htmlRes, cssRes] = await Promise.all([
  fetch(`${base}app-logs.html`),
  fetch(`${base}app-logs.css`),
]);
const TEMPLATE = await htmlRes.text();
const STYLES = await cssRes.text();

class AppLogs extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.deployments = [];
    this.refreshInterval = null;
  }

  static get observedAttributes() {
    return ['environment-id'];
  }

  connectedCallback() {
    this.render();
    this.loadDeployments();
    this.refreshInterval = setInterval(() => this.loadDeployments(), 5000);
  }

  disconnectedCallback() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  render() {
    this.shadowRoot.innerHTML = `<style>${STYLES}</style>${TEMPLATE}`;
  }

  async loadDeployments() {
    const envId = this.getAttribute('environment-id');
    if (!envId) return;

    const token = localStorage.getItem('token');
    const content = this.shadowRoot.getElementById('content');

    try {
      const res = await fetch(`/api/deployments?environmentId=${envId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to load deployments');

      this.deployments = await res.json();
      this.renderDeployments();
    } catch (error) {
      content.innerHTML = `
        <div class="card text-center">
          <p>Failed to load deployments.</p>
          <a href="#/dashboard" class="btn btn-primary mt-4">Back to Dashboard</a>
        </div>
      `;
    }
  }

  renderDeployments() {
    const content = this.shadowRoot.getElementById('content');

    if (this.deployments.length === 0) {
      content.innerHTML = `
        <h2>Deployment Logs</h2>
        <div class="card text-center mt-4">
          <p style="color: var(--text-muted);">No deployments yet.</p>
        </div>
      `;
      return;
    }

    content.innerHTML = `
      <h2>Deployment Logs</h2>
      <div class="env-list mt-4">
        ${this.deployments.map(dep => `
          <div class="card mb-4">
            <div class="card-header">
              <div>
                <span class="status status-${dep.status}">${dep.status}</span>
                <span style="margin-left: 12px; color: var(--text-muted);">
                  ${new Date(dep.createdAt).toLocaleString()}
                </span>
              </div>
              <button class="btn btn-secondary btn-sm view-logs-btn" data-id="${dep.id}">
                View Full Logs
              </button>
            </div>
            <div class="logs-container" style="max-height: 200px;">
              ${this.formatLogs(dep.logs || 'No logs available')}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    this.shadowRoot.querySelectorAll('.back-link').forEach(lnk => {
      lnk.addEventListener('click', (event) => {
        event.stopPropagation();
        event.preventDefault();

        window.history.back();
      });
    });
    content.querySelectorAll('.view-logs-btn').forEach(btn => {
      btn.addEventListener('click', () => this.viewFullLogs(btn.dataset.id));
    });
  }

  formatLogs(logs) {
    return logs.split('\n').map(line => {
      let className = 'log-line';
      if (line.includes('[stdout]')) className += ' log-stdout';
      if (line.includes('[stderr]') || line.includes('[build-err]')) className += ' log-stderr';
      if (line.match(/^\[\d{4}-\d{2}-\d{2}/)) {
        const parts = line.split('] ');
        if (parts.length > 1) {
          return `<div class="${className}"><span class="log-timestamp">${parts[0]}]</span> ${this.escapeHtml(parts.slice(1).join('] '))}</div>`;
        }
      }
      return `<div class="${className}">${this.escapeHtml(line)}</div>`;
    }).join('');
  }

  async viewFullLogs(deploymentId) {
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`/api/deployments/${deploymentId}/logs`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to load logs');

      const logs = await res.text();

      // Create a modal-like overlay to show full logs
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        z-index: 1000;
        padding: 20px;
        overflow: auto;
      `;
      overlay.innerHTML = `
        <div style="max-width: 1000px; margin: 0 auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="color: white;">Full Deployment Logs</h3>
            <button class="btn btn-secondary" id="close-logs">Close</button>
          </div>
          <div class="logs-container" style="max-height: none;">
            ${this.formatLogs(logs || 'No logs available')}
          </div>
        </div>
      `;

      this.shadowRoot.appendChild(overlay);
      overlay.querySelector('#close-logs').addEventListener('click', () => {
        overlay.remove();
      });
    } catch (error) {
      alert('Failed to load full logs');
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('app-logs', AppLogs);
