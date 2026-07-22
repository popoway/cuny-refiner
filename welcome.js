const openExtensionsBtn = document.getElementById('open-extensions');
const closeTabBtn = document.getElementById('close-tab');

function openExtensionsMenu() {
  const detailsUrl = `chrome://extensions/?id=${chrome.runtime.id}`;
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
