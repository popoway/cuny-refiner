const openExtensionsBtn = document.getElementById('open-extensions');
const closeTabBtn = document.getElementById('close-tab');
const isFirefox = navigator.userAgent.includes('Firefox');

if (openExtensionsBtn && isFirefox) {
  openExtensionsBtn.hidden = true;
}

function openExtensionsMenu() {
  const detailsUrl = isFirefox
    ? 'about:addons'
    : `chrome://extensions/?id=${chrome.runtime.id}`;
  chrome.tabs.create({ url: detailsUrl });
}

function closeCurrentTab() {
  window.close();
}

if (openExtensionsBtn) {
  openExtensionsBtn.addEventListener('click', openExtensionsMenu);
}

if (closeTabBtn) {
  closeTabBtn.addEventListener('click', closeCurrentTab);
}
