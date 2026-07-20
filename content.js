const LINK_CLASS_GD = 'cuny-refiner-GD-link';
const LINK_CLASS_EX = 'cuny-refiner-EX-link';
const DEFAULT_INSTITUTION_KEY = 'defaultInstitution';
const DEFAULT_TERM_KEY = 'defaultTerm';

let institutionMapPromise;

async function getDefaultInstitutionCode() {
  const stored = await chrome.storage.local.get(DEFAULT_INSTITUTION_KEY);
  const institutionCode = stored[DEFAULT_INSTITUTION_KEY];
  if (typeof institutionCode !== 'string') {
    return null;
  }

  const normalized = institutionCode.trim();
  return normalized || null;
}

async function getDefaultTermCode() {
  const stored = await chrome.storage.local.get(DEFAULT_TERM_KEY);
  const termCode = stored[DEFAULT_TERM_KEY];
  if (typeof termCode !== 'string') {
    return null;
  }

  const normalized = termCode.trim();
  return normalized || null;
}

async function getInstitutionMap() {
  if (!institutionMapPromise) {
    institutionMapPromise = fetch(chrome.runtime.getURL('inst.json'))
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to load inst.json');
        }
        return res.json();
      })
      .catch(() => ({}));
  }

  return institutionMapPromise;
}

async function getDefaultRmpValue(institutionCode) {
  if (!institutionCode) {
    return null;
  }

  const institutionMap = await getInstitutionMap();
  const rmp = institutionMap[institutionCode] && institutionMap[institutionCode].rmp;
  if (typeof rmp !== 'number') {
    return null;
  }

  return rmp;
}

function fillDefaultInstitutionInputs(institutionCode) {
  if (!institutionCode) {
    return;
  }

  const inputs = document.querySelectorAll('input[name="InputKeys_INSTITUTION"]');
  inputs.forEach((input) => {
    if (input.value.trim()) {
      return;
    }

    if (input.value === institutionCode) {
      return;
    }

    input.value = institutionCode;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function checkDefaultInstitutionCheckbox(institutionCode) {
  if (!institutionCode) {
    return;
  }

  const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"][name="inst_selection"]'));
  if (!checkboxes.length) {
    return;
  }

  // Respect the existing user/page selection state.
  const hasChecked = checkboxes.some((checkbox) => checkbox.checked);
  if (hasChecked) {
    return;
  }

  const target = checkboxes.find((checkbox) => checkbox.value === institutionCode);
  if (!target || target.checked) {
    return;
  }

  target.checked = true;
  target.dispatchEvent(new Event('input', { bubbles: true }));
  target.dispatchEvent(new Event('change', { bubbles: true }));
}

function fillDefaultTermInputs(termCode) {
  if (!termCode) {
    return;
  }

  const inputs = document.querySelectorAll('input[name="InputKeys_STRM"]');
  inputs.forEach((input) => {
    if (input.value.trim()) {
      return;
    }

    if (input.value === termCode) {
      return;
    }

    input.value = termCode;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function fillDefaultTermSelects(termCode) {
  if (!termCode) {
    return;
  }

  const selects = document.querySelectorAll('select[name="term_value"]');
  selects.forEach((select) => {
    // Do not override an existing, meaningful selection.
    if (typeof select.value === 'string' && select.value.trim()) {
      return;
    }

    const targetOption = Array.from(select.options).find((option) => option.value === termCode);
    if (!targetOption) {
      return;
    }

    select.value = termCode;
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function getInstructorText(cell) {
  const textNodes = Array.from(cell.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent || '')
    .join(' ')
    .trim();

  if (textNodes) {
    return textNodes;
  }

  return (cell.textContent || '').replace(/\s+/g, ' ').replace(/GD|EX/g, '').trim();
}

function getLastName(instructor) {
  const cleaned = (instructor || '').trim();
  if (!cleaned) {
    return '';
  }

  if (cleaned.includes(',')) {
    return cleaned.split(',')[0].trim();
  }

  const parts = cleaned.split(/\s+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
}

function createInstructorLink({ className, text, href, title }) {
  const link = document.createElement('a');
  link.className = className;
  link.textContent = text;
  link.href = href;
  link.title = title;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.style.marginLeft = '6px';
  link.style.fontSize = '0.85em';
  return link;
}

function ensureLinkForCell(cell, rmpValue) {
  const instructor = getInstructorText(cell);
  if (instructor.trim().toUpperCase() === 'TBA') {
    return;
  }

  const lastName = getLastName(instructor);
  if (!lastName) {
    return;
  }

  const gdUrl = `https://qc-prof-stat.web.app/?q=${encodeURIComponent(lastName)}`;
  
  let gdLink = cell.querySelector(`.${LINK_CLASS_GD}`);
  if (!gdLink) {
    gdLink = createInstructorLink({
      className: LINK_CLASS_GD,
      text: 'GD',
      href: gdUrl,
      title: `Search for "${lastName}" in the grade distributions database`,
    });
    cell.appendChild(document.createTextNode(' '));
    cell.appendChild(gdLink);
  } else if (gdLink.href !== gdUrl) {
    gdLink.href = gdUrl;
  }

  const exUrl = rmpValue
    ? `https://www.ratemyprofessors.com/search/professors/${rmpValue}?q=${encodeURIComponent(lastName)}`
  : null;
  const exLink = !!cell.querySelector(`.${LINK_CLASS_EX}`);
  if (!exUrl) {
    return;
  }

  if (!exLink) {
    const newExLink = createInstructorLink({
      className: LINK_CLASS_EX,
      text: 'RMP',
      href: exUrl,
      title: `Search for "${lastName}" on ratemyprofessors.com`,
    });
    cell.appendChild(document.createTextNode(' '));
    cell.appendChild(newExLink);
  } else {
    const existingExLink = cell.querySelector(`.${LINK_CLASS_EX}`);
    if (existingExLink.href !== exUrl) {
      existingExLink.href = exUrl;
    }
  }
}

async function injectInstructorLinks() {
  const institutionCode = await getDefaultInstitutionCode();
  const termCode = await getDefaultTermCode();

  fillDefaultInstitutionInputs(institutionCode);
  checkDefaultInstitutionCheckbox(institutionCode);
  fillDefaultTermInputs(termCode);
  fillDefaultTermSelects(termCode);

  const rmpValue = await getDefaultRmpValue(institutionCode);
  const cells = document.querySelectorAll('table td[data-label="Instructor"]');
  cells.forEach((cell) => ensureLinkForCell(cell, rmpValue));
}

injectInstructorLinks();

const observer = new MutationObserver(() => {
  injectInstructorLinks();
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') {
    return;
  }

  if (!changes[DEFAULT_INSTITUTION_KEY] && !changes[DEFAULT_TERM_KEY]) {
    return;
  }

  injectInstructorLinks();
});
