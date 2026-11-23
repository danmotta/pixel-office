const STATE_LABELS = {
  thinking: 'Pensando',
  typing: 'Digitando',
  done: 'Concluído',
  idle: 'Ocioso',
  error: 'Erro',
};

const bridgePill = document.getElementById('bridge-pill');
const tabsCount = document.getElementById('tabs-count');
const tabsList = document.getElementById('tabs-list');
const btnOpenOffice = document.getElementById('btn-open-office');
const btnReconnect = document.getElementById('btn-reconnect');

let currentBridgeUrl = 'http://127.0.0.1:4748';

function renderStatus(response) {
  const ok = Boolean(response?.ok);
  if (response?.bridgeUrl) currentBridgeUrl = response.bridgeUrl;

  bridgePill.textContent = ok ? 'Conectado' : 'Bridge Offline';
  bridgePill.className = `pill ${ok ? 'pill-ok' : 'pill-off'}`;

  const tabs = Array.isArray(response?.tabs) ? response.tabs : [];
  tabsCount.textContent = String(tabs.length);
  tabsList.replaceChildren();

  if (tabs.length === 0) {
    const li = document.createElement('li');
    li.className = 'tab-item';
    const msg = document.createElement('span');
    msg.className = 'tab-state';
    msg.textContent = 'Abra https://gemini.google.com em uma aba para monitorar.';
    li.appendChild(msg);
    tabsList.appendChild(li);
    return;
  }

  for (const tab of tabs) {
    const li = document.createElement('li');
    li.className = 'tab-item';

    const title = document.createElement('span');
    title.className = 'tab-title';
    title.textContent = tab.title || 'Gemini Web';

    const state = document.createElement('span');
    state.className = 'tab-state';
    state.textContent = STATE_LABELS[tab.state] || tab.state || 'Ocioso';

    li.append(title, state);
    tabsList.appendChild(li);
  }
}

async function refreshStatus(actionType) {
  try {
    const response = await chrome.runtime.sendMessage({ type: actionType });
    renderStatus(response);
  } catch {
    renderStatus({ ok: false, tabs: [] });
  }
}

btnOpenOffice.addEventListener('click', async () => {
  await chrome.tabs.create({ url: currentBridgeUrl });
});

btnReconnect.addEventListener('click', async () => {
  bridgePill.textContent = 'Sincronizando…';
  await refreshStatus('RECONNECT_SYNC');
});

void refreshStatus('POPUP_STATUS');
