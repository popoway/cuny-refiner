const MENU_ID_SSV = 'ssv-selection';
const MENU_ID_SSC = 'ssc-selection';
const MENU_ID_MSI = 'msi-selection';
const MENU_ID_TREX = 'trex-selection';
const MENU_ID_dw = 'dw-selection';
const MENU_ID_sb = 'sb-selection';
const MENU_ID_nav = 'nav-selection';
const MENU_CONFIG = {
  [MENU_ID_SSV]: {
    title: 'Open Student Summary View for "%s"',
    url: 'https://home.cunyfirst.cuny.edu/psp/cnyihprd/EMPLOYEE/SA/c/CU_CUNY_CS_CIS_2.CU_SIQSRI_CP.GBL&?IsFolder&Action=&EMPLID=',
  },
  [MENU_ID_SSC]: {
    title: 'Open Student Services Center for "%s"',
    url: 'https://cssa.cunyfirst.cuny.edu/psc/cnycsprd/EMPLOYEE/SA/c/SCC_ADMIN_OVRD_STDNT.SSS_STUDENT_CENTER.GBL&?IsFolder&Action=&EMPLID=',
  },
  [MENU_ID_MSI]: {
    title: 'Open Manage Service Indicators for "%s"',
    url: 'https://cssa.cunyfirst.cuny.edu/psc/cnycsprd/EMPLOYEE/SA/c/MAINTAIN_SERVICE_IND_STDNT.ACTIVE_SRVC_INDICA.GBL&?IsFolder&Action=&EMPLID=',
  },
  [MENU_ID_TREX]: {
    title: 'Open T-Rex Transfer Plan for "%s"',
    url: 'https://explorer.cuny.edu/student/viewTransferIntentionForm?form=',
  },
  [MENU_ID_dw]: {
    title: 'Open DegreeWorks for "%s"',
    url: 'https://degreeworks.cuny.edu/Dashboard_qc?studentId=',
  },
  [MENU_ID_sb]: {
    title: 'Open Schedule Builder for "%s"',
    url: 'https://sb.cunyfirst.cuny.edu/advisee.jsp?advisee=',
  },
  [MENU_ID_nav]: {
    title: 'Open QC Navigate for "%s"',
    url: 'https://qc-cuny.campus.eab.com/search?keyword=',
  },
};
const MENU_URL_PATTERNS = ['*://home.cunyfirst.cuny.edu/*', '*://cssa.cunyfirst.cuny.edu/*', '*://hrsa.cunyfirst.cuny.edu/*', '*://sb.cunyfirst.cuny.edu/*', '*://explorer.cuny.edu/*', '*://*.campus.eab.com/*', '*://degreeworks.cuny.edu/*', '*://cunyithelp.cuny.edu/*', '*://support.qc.cuny.edu/*', '*://outlook.cloud.microsoft/*', '*://cuny907-my.sharepoint.com/*', '*://cuny907.sharepoint.com/*', '*://usc-excel.officeapps.live.com/*'];

function createSelectionMenus() {
  Object.entries(MENU_CONFIG).forEach(([id, config]) => {
    chrome.contextMenus.create({
      id,
      title: config.title,
      contexts: ['selection'],
      documentUrlPatterns: MENU_URL_PATTERNS,
    });
  });
}

chrome.runtime.onInstalled.addListener((details) => {
  createSelectionMenus();

  if (details.reason === 'install') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('welcome.html'),
    });
  }
});

chrome.contextMenus.onClicked.addListener((info) => {
  const config = MENU_CONFIG[info.menuItemId];

  if (!config || !info.selectionText) {
    return;
  }

  const url = `${config.url}${encodeURIComponent(info.selectionText)}`;
  chrome.tabs.create({ url });
});