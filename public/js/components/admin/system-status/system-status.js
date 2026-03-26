const base = new URL('.', import.meta.url).href;
const [htmlRes, cssRes] = await Promise.all([
  fetch(`${base}system-status.html`),
  fetch(`${base}system-status.css`),
]);
const TEMPLATE = await htmlRes.text();
const STYLES = await cssRes.text();

const TOOL_ICONS = {
  docker: '🐳',
};

class SystemStatus extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.shadowRoot.getElementById('refresh-btn').addEventListener('click', () => this.loadStatus());
    this.loadStatus();
  }

  render() {
    this.shadowRoot.innerHTML = `<style>${STYLES}</style>${TEMPLATE}`;
    this.shadowRoot.getElementById('refresh-btn').addEventListener('click', () => this.loadStatus());
  }

  async loadStatus() {
    const token = localStorage.getItem('token');
    const content = this.shadowRoot.getElementById('content');
    const refreshBtn = this.shadowRoot.getElementById('refresh-btn');

    refreshBtn.disabled = true;
    content.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;

    try {
      const response = await fetch('/api/status', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to load status');
      }

      const data = await response.json();
      this.renderStatus(data);
    } catch (error) {
      content.innerHTML = `<p class="error-message">Failed to load system status. Please try again.</p>`;
    } finally {
      refreshBtn.disabled = false;
    }
  }

  renderStatus(data) {
    const content = this.shadowRoot.getElementById('content');
    const ts = new Date(data.timestamp).toLocaleString();

    const bannerClass = data.status === 'ok' ? 'ok' : 'degraded';
    const bannerLabel = data.status === 'ok' ? 'All systems operational' : 'Some systems degraded';

    const toolRows = Object.entries(data.tools).map(([name, info]) => {
      const icon = TOOL_ICONS[name] || '🔧';
      const badgeClass = info.available ? 'badge-up' : 'badge-down';
      const badgeLabel = info.available ? 'Available' : 'Unavailable';
      const detail = info.available
        ? `v${this.escape(info.version ?? '')}`
        : this.escape(info.error ?? 'Not reachable');
      return `
        <div class="tool-row">
          <div class="tool-icon">${icon}</div>
          <div class="tool-info">
            <div class="tool-name">${this.escape(name)}</div>
            <div class="tool-version">${detail}</div>
          </div>
          <span class="badge ${badgeClass}">${badgeLabel}</span>
        </div>
      `;
    }).join('');

    const containersBody = data.containers.length === 0
      ? `<tr><td colspan="4" class="empty-note">No Docker-type application environments configured.</td></tr>`
      : data.containers.map(c => `
          <tr>
            <td>${this.escape(c.applicationName)}</td>
            <td>${this.escape(c.environmentName)}</td>
            <td class="cell-mono">${this.escape(c.containerName)}</td>
            <td>
              <span class="badge ${c.running ? 'badge-running' : 'badge-stopped'}">
                ${c.running ? 'Running' : 'Stopped'}
              </span>
              ${c.running && c.status ? `<span style="font-size:12px;color:#64748b;margin-left:8px;">${this.escape(c.status)}</span>` : ''}
            </td>
          </tr>
        `).join('');

    content.innerHTML = `
      <div class="status-banner ${bannerClass}">
        <span class="status-dot"></span>
        <span>${bannerLabel}</span>
        <span class="status-timestamp">Last updated: ${ts}</span>
      </div>
      <div class="cards">
        <div class="card">
          <div class="card-header"><h2>External Tools</h2></div>
          <div class="card-body">${toolRows}</div>
        </div>
        <div class="card">
          <div class="card-header"><h2>Docker Containers</h2></div>
          <div class="card-body">
            <table>
              <thead>
                <tr>
                  <th>Application</th>
                  <th>Environment</th>
                  <th>Container</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>${containersBody}</tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  escape(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

customElements.define('system-status', SystemStatus);
