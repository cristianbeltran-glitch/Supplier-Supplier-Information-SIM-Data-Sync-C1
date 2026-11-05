// c / u = "Yes" | "No" (current sync value); cb / ub = action button ('on' | 'off' | null for none)
const FIELDS = [
  ['Name', 'Yes', 'Yes', 'on', 'on'],
  ['Display Name', 'Yes', 'Yes', 'on', 'on'],
  ['DUNS Number', 'Yes', 'Yes', 'on', 'on'],
  ['US Tax ID', 'Yes', 'Yes', 'on', 'on'],
  ['PO Delivery Details', 'Yes', 'Yes', 'on', 'on'],
  ['Payment Term', 'Yes', 'Yes', 'on', 'on'],
  ['Primary Contact', 'Yes', 'Yes', null, 'on'],
  ['Primary Address', 'Yes', 'Yes', null, 'on'],
  ['Default Commodity', 'Yes', 'No', null, 'off'],
  ['Content Groups', 'Yes', 'No', 'on', 'off'],
  ['Tax Registrations', 'No', 'Yes', null, 'on'],
  ['Preferred Currency', 'Yes', 'Yes', 'on', 'on'],
  ['International Tax ID', 'Yes', 'Yes', 'on', 'on'],
  ['Industry', 'Yes', 'Yes', 'on', 'on'],
  ['Country of Operation', 'Yes', 'Yes', 'on', 'on'],
].map(([name, c, u, cb, ub]) => ({ name, c, u, cb, ub, erp: 'idle', lastSync: null }));

const TIPS = {
  'create-on': 'Deactivate Sync Upon Create',
  'create-off': 'Activate to Sync Upon Create',
  'update-on': 'Deactivate Sync Upon Update',
  'update-off': 'Activate to Sync Upon Update',
  'erp-on': 'Sync with ERP',
  'erp-syncing': 'ERP sync in progress. This is a background process and it may take time to complete. You can keep working while it runs.',
};
const ERP_SYNC_MS = 8000; // simulated duration of the background job
const syncAllBtn = document.getElementById('sync-all');
const erpStatus = document.getElementById('erp-status');

const tbody = document.getElementById('rows');
const tooltip = document.getElementById('tooltip');
const banner = document.getElementById('banner');
const bannerText = document.getElementById('banner-text');
let selectedName = null; // row last changed (blue left marker)

function slot(f, kind) {
  if (kind === 'erp') { // ERP sync: idle -> syncing (background job) -> idle
    const syncing = f.erp === 'syncing';
    const synced = !syncing && f.lastSync;
    const tip = syncing ? TIPS['erp-syncing']
      : synced ? `Synced with ERP at ${f.lastSync}. Click to sync again.` : TIPS['erp-on'];
    return `<span class="slot"><button class="action-btn erp${syncing ? ' syncing' : ''}${synced ? ' synced' : ''}" data-field="${f.name}" data-kind="erp" data-tip="${tip}" aria-label="${tip}"${syncing ? ' aria-busy="true" aria-disabled="true"' : ''}></button></span>`;
  }
  const state = kind === 'create' ? f.cb : f.ub;
  if (!state) return '<span class="slot"></span>';
  const tip = TIPS[`${kind}-${state}`];
  return `<span class="slot"><button class="action-btn ${kind}${state === 'off' ? ' disabled' : ''}" data-field="${f.name}" data-kind="${kind}" data-tip="${tip}" aria-label="${tip}"></button></span>`;
}

function render() {
  const q = document.getElementById('search').value.trim().toLowerCase();
  const view = document.getElementById('view').value;
  tbody.innerHTML = FIELDS
    .filter(f => f.name.toLowerCase().includes(q) &&
      (view === 'all' || (view === 'create' ? f.c === 'Yes' : f.u === 'Yes')))
    .map(f => `
      <tr${f.name === selectedName ? ' class="selected"' : ''}>
        <td>${f.name}</td><td></td><td>${f.c}</td><td>${f.u}</td>
        <td class="actions">${slot(f, 'create')}${slot(f, 'update')}${slot(f, 'erp')}</td>
      </tr>`).join('');
  renderErpStatus();
}

// Tooltip on hover/focus of an action icon, shown to the right of the icon
function showTip(btn) {
  tooltip.textContent = btn.dataset.tip;
  tooltip.hidden = false;
  const r = btn.getBoundingClientRect();
  const t = tooltip.getBoundingClientRect();
  let left = r.right + 12;
  if (left + t.width > window.innerWidth - 8) left = r.left - t.width - 12; // flip if no room
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${r.top + r.height / 2 - t.height / 2}px`;
}
const hideTip = () => { tooltip.hidden = true; };

// Overall ERP status next to the "Sync All" button
function renderErpStatus() {
  const total = FIELDS.length;
  const syncing = FIELDS.filter(f => f.erp === 'syncing').length;
  const done = FIELDS.filter(f => f.lastSync).length;
  syncAllBtn.disabled = syncing > 0;
  syncAllBtn.classList.toggle('busy', syncing > 0);
  syncAllBtn.textContent = syncing > 0 ? 'Syncing with ERP…' : 'Sync All with ERP';
  if (syncing > 0) {
    erpStatus.className = 'erp-status in-progress';
    erpStatus.textContent = `Syncing ${syncing} of ${total} fields in the background. This may take time to complete.`;
  } else if (done === total) {
    const last = FIELDS.map(f => f.lastSync).sort().pop();
    erpStatus.className = 'erp-status synced';
    erpStatus.textContent = `All fields synced with ERP · Last synced ${last}`;
  } else if (done > 0) {
    erpStatus.className = 'erp-status partial';
    erpStatus.textContent = `${done} of ${total} fields synced with ERP`;
  } else {
    erpStatus.className = 'erp-status';
    erpStatus.textContent = '';
  }
}

const nowLabel = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// Sync every field with the ERP in one background run; rows finish progressively
function syncAll() {
  if (FIELDS.some(f => f.erp === 'syncing')) return;
  FIELDS.forEach(f => { f.erp = 'syncing'; });
  bannerText.textContent = 'Sync with ERP started for all fields. This is a background process and it may take time to complete.';
  banner.hidden = false;
  render();
  const step = ERP_SYNC_MS / FIELDS.length;
  FIELDS.forEach((f, i) => setTimeout(() => {
    f.erp = 'idle';
    f.lastSync = nowLabel();
    if (i === FIELDS.length - 1) {
      bannerText.textContent = 'All fields synced with ERP';
      banner.hidden = false;
    }
    render();
  }, step * (i + 1)));
}
syncAllBtn.addEventListener('click', syncAll);

// Start the background ERP sync and tell the user it is running
function startErpSync(f) {
  if (f.erp === 'syncing') return;
  f.erp = 'syncing';
  bannerText.textContent = `Sync with ERP started for ${f.name}. This is a background process and it may take time to complete.`;
  banner.hidden = false;
  render();
  const nb = tbody.querySelector(`.action-btn.erp[data-field="${f.name}"]`);
  if (nb) showTip(nb); // show the status info right away
  setTimeout(() => {
    f.erp = 'idle';
    f.lastSync = nowLabel();
    bannerText.textContent = `Sync with ERP completed for ${f.name}`;
    banner.hidden = false;
    hideTip();
    render();
  }, ERP_SYNC_MS);
}

// Toggle activation of a create/update sync action and confirm with the green banner
function toggle(btn) {
  const f = FIELDS.find(x => x.name === btn.dataset.field);
  const kind = btn.dataset.kind;
  if (kind === 'erp') return startErpSync(f);
  const key = kind === 'create' ? 'cb' : 'ub';
  const val = kind === 'create' ? 'c' : 'u';
  const activate = f[key] === 'off';
  f[key] = activate ? 'on' : 'off';
  f[val] = activate ? 'Yes' : 'No';
  selectedName = f.name;
  const label = kind === 'create' ? 'Create' : 'Update';
  bannerText.textContent = `Setup value for Sync Upon ${label} is ${activate ? 'activated' : 'deactivated'}`;
  banner.hidden = false;
  hideTip();
  render();
}

tbody.addEventListener('click', e => { const b = e.target.closest('.action-btn'); if (b) toggle(b); });
document.getElementById('banner-close').addEventListener('click', () => { banner.hidden = true; });
tbody.addEventListener('mouseover', e => { const b = e.target.closest('.action-btn'); if (b) showTip(b); });
tbody.addEventListener('mouseout', e => { if (e.target.closest('.action-btn')) hideTip(); });
tbody.addEventListener('focusin', e => { const b = e.target.closest('.action-btn'); if (b) showTip(b); });
tbody.addEventListener('focusout', hideTip);

document.getElementById('search').addEventListener('input', render);
document.getElementById('view').addEventListener('change', render);
render();
