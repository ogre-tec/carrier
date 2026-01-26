const base = new URL('.', import.meta.url).href;
const [htmlRes, cssRes] = await Promise.all([
  fetch(`${base}json-editor.html`),
  fetch(`${base}json-editor.css`),
]);
const TEMPLATE = await htmlRes.text();
const STYLES = await cssRes.text();

class JsonEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._value = {};
    this._rawMode = false;
  }

  connectedCallback() {
    this.render();
  }

  get value() {
    return this._value;
  }

  set value(val) {
    if (typeof val === 'string') {
      try {
        this._value = JSON.parse(val);
      } catch {
        this._value = {};
      }
    } else {
      this._value = val || {};
    }
    this.renderEditor();
  }

  getValue() {
    return this._value;
  }

  getJsonString() {
    return JSON.stringify(this._value, null, 2);
  }

  render() {
    this.shadowRoot.innerHTML = `<style>${STYLES}</style>${TEMPLATE}`;

    this.shadowRoot.getElementById('kv-mode').addEventListener('click', () => {
      this.setMode(false);
    });

    this.shadowRoot.getElementById('raw-mode').addEventListener('click', () => {
      this.setMode(true);
    });

    this.renderEditor();
  }

  setMode(rawMode) {
    this._rawMode = rawMode;

    const kvBtn = this.shadowRoot.getElementById('kv-mode');
    const rawBtn = this.shadowRoot.getElementById('raw-mode');

    if (rawMode) {
      kvBtn.classList.remove('active');
      rawBtn.classList.add('active');
    } else {
      kvBtn.classList.add('active');
      rawBtn.classList.remove('active');
    }

    this.renderEditor();
  }

  renderEditor() {
    const container = this.shadowRoot.getElementById('editor-content');
    if (!container) return;

    if (this._rawMode) {
      this.renderRawEditor(container);
    } else {
      this.renderKvEditor(container);
    }
  }

  renderKvEditor(container) {
    const entries = Object.entries(this._value);

    container.innerHTML = `
      <div class="kv-editor">
        ${entries.length > 0 ? `
          <div class="kv-header">
            <span>Key</span>
            <span>Value</span>
            <span></span>
          </div>
        ` : ''}
        <div id="kv-rows">
          ${entries.length === 0 ? `
            <div class="empty-state">No variables defined. Click "Add Variable" to add one.</div>
          ` : entries.map(([key, value], index) => `
            <div class="kv-row" data-index="${index}">
              <input type="text" class="key-input" value="${this.escapeAttr(key)}" placeholder="KEY_NAME">
              <input type="text" class="value-input" value="${this.escapeAttr(String(value))}" placeholder="value">
              <button class="remove-btn" data-index="${index}">&times;</button>
            </div>
          `).join('')}
        </div>
        <div class="add-row">
          <button class="add-btn" id="add-var-btn">+ Add Variable</button>
        </div>
      </div>
    `;

    // Event listeners for key/value inputs
    container.querySelectorAll('.key-input, .value-input').forEach(input => {
      input.addEventListener('input', () => this.updateFromKv());
      input.addEventListener('blur', () => this.updateFromKv());
    });

    // Event listeners for remove buttons
    container.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.removeEntry(index);
      });
    });

    // Add button
    container.querySelector('#add-var-btn').addEventListener('click', () => {
      this.addEntry();
    });
  }

  renderRawEditor(container) {
    container.innerHTML = `
      <div class="raw-editor">
        <textarea id="raw-textarea">${this.escapeHtml(JSON.stringify(this._value, null, 2))}</textarea>
        <div id="json-error" class="error-msg" style="display: none;"></div>
      </div>
    `;

    const textarea = container.querySelector('#raw-textarea');
    const errorDiv = container.querySelector('#json-error');

    textarea.addEventListener('input', () => {
      try {
        this._value = JSON.parse(textarea.value);
        errorDiv.style.display = 'none';
        this.dispatchEvent(new CustomEvent('change', { detail: this._value }));
      } catch (e) {
        errorDiv.textContent = 'Invalid JSON: ' + e.message;
        errorDiv.style.display = 'block';
      }
    });

    // Format on blur
    textarea.addEventListener('blur', () => {
      try {
        const parsed = JSON.parse(textarea.value);
        textarea.value = JSON.stringify(parsed, null, 2);
        this._value = parsed;
        errorDiv.style.display = 'none';
      } catch {
        // Keep as is if invalid
      }
    });
  }

  updateFromKv() {
    const rows = this.shadowRoot.querySelectorAll('.kv-row');
    const newValue = {};

    rows.forEach(row => {
      const key = row.querySelector('.key-input')?.value?.trim();
      const value = row.querySelector('.value-input')?.value;

      if (key) {
        newValue[key] = value;
      }
    });

    this._value = newValue;
    this.dispatchEvent(new CustomEvent('change', { detail: this._value }));
  }

  addEntry() {
    this._value[''] = '';
    this.renderEditor();

    // Focus the new key input
    const rows = this.shadowRoot.querySelectorAll('.kv-row');
    const lastRow = rows[rows.length - 1];
    if (lastRow) {
      lastRow.querySelector('.key-input')?.focus();
    }
  }

  removeEntry(index) {
    const entries = Object.entries(this._value);
    entries.splice(index, 1);
    this._value = Object.fromEntries(entries);
    this.renderEditor();
    this.dispatchEvent(new CustomEvent('change', { detail: this._value }));
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  escapeAttr(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

customElements.define('json-editor', JsonEditor);
