const SETTING_KEY = 'defaultInstitution';
const TERM_SETTING_KEY = 'defaultTerm';
const selectEl = document.getElementById('institution');
const statusEl = document.getElementById('status');
const termInputEl = document.getElementById('default-term');
const termPreviewEl = document.getElementById('term-preview');

let termSaveTimeoutId = null;
let lastSavedTerm = '';

const TERM_LABELS = {
  '9': 'Fall',
  '6': 'Summer',
  '2': 'Spring',
};

function showStatus(message) {
  statusEl.textContent = message;
  statusEl.classList.add('show');
  window.setTimeout(() => {
    statusEl.classList.remove('show');
  }, 1400);
}

function getFriendlyTermName(rawValue) {
  const value = (rawValue || '').trim();
  if (!/^\d{4}$/.test(value)) {
    return null;
  }

  if (value[0] !== '1') {
    return null;
  }

  const season = TERM_LABELS[value[3]];
  if (!season) {
    return null;
  }

  const year = Number(`20${value.slice(1, 3)}`);
  if (Number.isNaN(year)) {
    return null;
  }

  return `${year} ${season} Term`;
}

function renderTermPreview(rawValue) {
  const friendly = getFriendlyTermName(rawValue);
  if (!rawValue) {
    termPreviewEl.textContent = '';
    termPreviewEl.classList.remove('invalid');
    return;
  }

  if (!friendly) {
    termPreviewEl.textContent = 'Invalid term code';
    termPreviewEl.classList.add('invalid');
    return;
  }

  termPreviewEl.textContent = friendly;
  termPreviewEl.classList.remove('invalid');
}

function queueTermAutoSave() {
  if (termSaveTimeoutId) {
    window.clearTimeout(termSaveTimeoutId);
  }

  termSaveTimeoutId = window.setTimeout(async () => {
    const value = termInputEl.value.trim();
    const friendly = getFriendlyTermName(value);

    if (!friendly || value === lastSavedTerm) {
      return;
    }

    await chrome.storage.local.set({ [TERM_SETTING_KEY]: value });
    lastSavedTerm = value;
    showStatus(`Saved: ${friendly}`);
  }, 250);
}

function createOptions(instMap) {
  const entries = Object.entries(instMap).sort((a, b) => {
    const left = a[1].description || a[0];
    const right = b[1].description || b[0];
    return left.localeCompare(right);
  });

  const fragment = document.createDocumentFragment();
  for (const [code, info] of entries) {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = `${info.description || code} (${code})`;
    fragment.appendChild(option);
  }

  return fragment;
}

async function loadInstitutions() {
  const res = await fetch(chrome.runtime.getURL('inst.json'));
  if (!res.ok) {
    throw new Error('Failed to load inst.json');
  }
  return res.json();
}

async function restoreSelection(validCodes) {
  const stored = await chrome.storage.local.get([SETTING_KEY, TERM_SETTING_KEY]);
  const saved = stored[SETTING_KEY];
  if (saved && validCodes.has(saved)) {
    selectEl.value = saved;
  }

  const savedTerm = typeof stored[TERM_SETTING_KEY] === 'string' ? stored[TERM_SETTING_KEY] : '';
  termInputEl.value = savedTerm;
  lastSavedTerm = savedTerm;
  renderTermPreview(savedTerm);
}

async function initialize() {
  try {
    const institutions = await loadInstitutions();
    const options = createOptions(institutions);
    const validCodes = new Set(Object.keys(institutions));

    selectEl.innerHTML = '';
    selectEl.appendChild(options);

    await restoreSelection(validCodes);
  } catch (err) {
    selectEl.innerHTML = '';
    const fallback = document.createElement('option');
    fallback.value = '';
    fallback.textContent = 'Unable to load institutions';
    selectEl.appendChild(fallback);
  }
}

selectEl.addEventListener('change', async () => {
  if (!selectEl.value) {
    return;
  }

  await chrome.storage.local.set({ [SETTING_KEY]: selectEl.value });
  showStatus(`Saved: ${selectEl.options[selectEl.selectedIndex].textContent}`);
});

termInputEl.addEventListener('input', () => {
  termInputEl.value = termInputEl.value.replace(/\D/g, '').slice(0, 4);
  renderTermPreview(termInputEl.value);
  queueTermAutoSave();
});

document.getElementById('app-version').textContent = `v${chrome.runtime.getManifest().version}`;

initialize();