const LINK_CLASS_GD = 'cuny-refiner-GD-link';
const LINK_CLASS_EX = 'cuny-refiner-EX-link';
const DEFAULT_INSTITUTION_KEY = 'defaultInstitution';

let institutionMapPromise;

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

async function getDefaultRmpValue() {
  const stored = await chrome.storage.local.get(DEFAULT_INSTITUTION_KEY);
  const institutionCode = stored[DEFAULT_INSTITUTION_KEY];
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
  const rmpValue = await getDefaultRmpValue();
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
  if (areaName !== 'local' || !changes[DEFAULT_INSTITUTION_KEY]) {
    return;
  }

  injectInstructorLinks();
});
