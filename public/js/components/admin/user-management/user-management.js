const base = new URL('.', import.meta.url).href;
const [htmlRes, cssRes] = await Promise.all([
  fetch(`${base}user-management.html`),
  fetch(`${base}user-management.css`),
]);
const TEMPLATE = await htmlRes.text();
const STYLES = await cssRes.text();

class UserManagement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.users = [];
  }

  connectedCallback() {
    this.render();
    this.loadUsers();
  }

  render() {
    this.shadowRoot.innerHTML = `<style>${STYLES}</style>${TEMPLATE}`;
  }

  async loadUsers() {
    const token = localStorage.getItem('token');
    const content = this.shadowRoot.getElementById('content');

    try {
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to load users');
      }

      this.users = await response.json();
      this.renderUsers();
    } catch (error) {
      content.innerHTML = `<p class="error-message">Failed to load users. Please try again.</p>`;
    }
  }

  renderUsers() {
    const content = this.shadowRoot.getElementById('content');

    if (this.users.length === 0) {
      content.innerHTML = `<p style="padding: 20px; color: #64748b;">No users found.</p>`;
      return;
    }

    const rows = this.users.map(user => `
      <tr class="${user.protected ? 'row-protected' : ''}">
        <td>
          <div class="user-name">
            ${this.escape(user.name)}
            ${user.protected ? '<span class="badge-protected">primary</span>' : ''}
          </div>
          <div class="user-email">${this.escape(user.email)}</div>
        </td>
        <td>
          <select class="role-select" data-id="${user.id}" data-role="${user.role}" ${user.protected ? 'disabled' : ''}>
            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
            <option value="deployer" ${user.role === 'deployer' ? 'selected' : ''}>Deployer</option>
          </select>
        </td>
        <td>${this.escape(user.provider)}</td>
        <td>
          <span class="badge ${user.active ? 'badge-active' : 'badge-inactive'}">
            ${user.active ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td>
          ${user.protected
            ? '<span class="protected-label">Protected</span>'
            : `<button
                class="btn ${user.active ? 'btn-deactivate' : 'btn-activate'}"
                data-id="${user.id}"
                data-active="${user.active}"
              >${user.active ? 'Deactivate' : 'Activate'}</button>`
          }
        </td>
      </tr>
    `).join('');

    content.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Provider</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;

    content.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', () => this.toggleActive(btn));
    });

    content.querySelectorAll('select.role-select').forEach(select => {
      select.addEventListener('change', () => this.changeRole(select));
    });
  }

  async toggleActive(btn) {
    const id = btn.dataset.id;
    const currentActive = btn.dataset.active === 'true';
    const token = localStorage.getItem('token');

    btn.disabled = true;

    try {
      const response = await fetch(`/api/users/${id}/active`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: !currentActive }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      const updated = await response.json();
      const idx = this.users.findIndex(u => u.id === id);
      if (idx !== -1) {
        this.users[idx] = { ...this.users[idx], active: updated.active };
      }
      this.renderUsers();
    } catch (error) {
      btn.disabled = false;
      console.error('Failed to toggle user active state:', error);
    }
  }

  async changeRole(select) {
    const id = select.dataset.id;
    const previousRole = select.dataset.role;
    const newRole = select.value;
    const token = localStorage.getItem('token');

    select.disabled = true;

    try {
      const response = await fetch(`/api/users/${id}/role`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error('Failed to update role');
      }

      const updated = await response.json();
      const idx = this.users.findIndex(u => u.id === id);
      if (idx !== -1) {
        this.users[idx] = { ...this.users[idx], role: updated.role };
      }
      select.dataset.role = updated.role;
    } catch (error) {
      select.value = previousRole;
      console.error('Failed to change user role:', error);
    } finally {
      select.disabled = false;
    }
  }

  escape(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

customElements.define('user-management', UserManagement);
