const DEFAULT_BRIDGE_URL = 'http://127.0.0.1:4748';
const ALARM_NAME = 'pixel-office-sync';
const STORAGE_KEYS = {
  TABS: 'poGeminiTabs',
  BRIDGE_OK: 'poBridgeOk',
  BRIDGE_CHECKED_AT: 'poBridgeCheckedAt',
  BRIDGE_URL: 'poBridgeUrl',
};

async function getBridgeUrl() {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.BRIDGE_URL);
  return stored[STORAGE_KEYS.BRIDGE_URL] || DEFAULT_BRIDGE_URL;
}

async function getTrackedTabs() {
  const data = await chrome.storage.session.get(STORAGE_KEYS.TABS);
  return data[STORAGE_KEYS.TABS] || {};
}

async function setTrackedTabs(tabsMap) {
  await chrome.storage.session.set({ [STORAGE_KEYS.TABS]: tabsMap });
}

async function updateBadge(tabsMap, bridgeOk) {
  const entries = Object.values(tabsMap);
  const thinkingCount = entries.filter((t) => t.state === 'thinking').length;
  const totalCount = entries.length;

  if (!bridgeOk) {
    await chrome.action.setBadgeText({ text: 'OFF' });
    await chrome.action.setBadgeBackgroundColor({ color: '#64748b' });
    return;
  }

  if (thinkingCount > 0) {
    await chrome.action.setBadgeText({ text: String(thinkingCount) });
    await chrome.action.setBadgeBackgroundColor({ color: '#9333ea' });
    return;
  }

  if (totalCount > 0) {
    await chrome.action.setBadgeText({ text: String(totalCount) });
    await chrome.action.setBadgeBackgroundColor({ color: '#0284c7' });
    return;
  }

  await chrome.action.setBadgeText({ text: '' });
}

async function postToBridge(pathname, body) {
  const baseUrl = await getBridgeUrl();
  try {
    const resp = await fetch(`${baseUrl}${pathname}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const ok = resp.ok;
    await chrome.storage.session.set({
      [STORAGE_KEYS.BRIDGE_OK]: ok,
      [STORAGE_KEYS.BRIDGE_CHECKED_AT]: Date.now(),
    });
    return ok;
  } catch {
    await chrome.storage.session.set({
      [STORAGE_KEYS.BRIDGE_OK]: false,
      [STORAGE_KEYS.BRIDGE_CHECKED_AT]: Date.now(),
    });
    return false;
  }
}

async function checkBridgeHealth() {
  const baseUrl = await getBridgeUrl();
  let ok = false;
  try {
    const resp = await fetch(`${baseUrl}/health`, { method: 'GET' });
    if (resp.ok) {
      const data = await resp.json();
      ok = Boolean(data && data.ok && data.service === 'pixel-office');
    }
  } catch {
    ok = false;
  }
  await chrome.storage.session.set({
    [STORAGE_KEYS.BRIDGE_OK]: ok,
    [STORAGE_KEYS.BRIDGE_CHECKED_AT]: Date.now(),
  });
  return ok;
}

async function pruneClosedTabs() {
  const tracked = await getTrackedTabs();
  const liveTabs = await chrome.tabs.query({ url: 'https://gemini.google.com/*' });
  const liveIds = new Set(liveTabs.map((t) => String(t.id)));
  let changed = false;

  for (const tabIdStr of Object.keys(tracked)) {
    if (!liveIds.has(tabIdStr)) {
      delete tracked[tabIdStr];
      changed = true;
      await postToBridge('/api/gemini-event', {
        event: 'tab_closed',
        tabId: Number(tabIdStr),
        ts: Date.now(),
      });
    }
  }

  if (changed) {
    await setTrackedTabs(tracked);
  }
  return tracked;
}

async function ensureAlarm() {
  const existing = await chrome.alarms.get(ALARM_NAME);
  if (!existing) {
    await chrome.alarms.create(ALARM_NAME, { periodInMinutes: 0.5 });
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await ensureAlarm();
  const ok = await checkBridgeHealth();
  const tabs = await pruneClosedTabs();
  await updateBadge(tabs, ok);
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureAlarm();
  const ok = await checkBridgeHealth();
  const tabs = await pruneClosedTabs();
  await updateBadge(tabs, ok);
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  const ok = await checkBridgeHealth();
  const tabs = await pruneClosedTabs();
  await updateBadge(tabs, ok);
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const tracked = await getTrackedTabs();
  const key = String(tabId);
  if (tracked[key]) {
    delete tracked[key];
    await setTrackedTabs(tracked);
    const ok = await postToBridge('/api/gemini-event', {
      event: 'tab_closed',
      tabId,
      ts: Date.now(),
    });
    await updateBadge(tracked, ok);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (!changeInfo.url) return;
  if (changeInfo.url.startsWith('https://gemini.google.com/')) return;
  const tracked = await getTrackedTabs();
  const key = String(tabId);
  if (tracked[key]) {
    delete tracked[key];
    await setTrackedTabs(tracked);
    const ok = await postToBridge('/api/gemini-event', {
      event: 'tab_closed',
      tabId,
      ts: Date.now(),
    });
    await updateBadge(tracked, ok);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    await ensureAlarm();

    if (message?.type === 'GEMINI_STATE' && sender?.tab?.id != null) {
      const tabId = sender.tab.id;
      const payload = {
        ...message.payload,
        tabId,
        id: `gemini-tab-${tabId}`,
        title: message.payload?.title || sender.tab.title || 'Gemini Web',
        url: message.payload?.url || sender.tab.url || 'https://gemini.google.com/app',
      };

      const tracked = await getTrackedTabs();
      tracked[String(tabId)] = payload;
      await setTrackedTabs(tracked);

      const ok = await postToBridge('/api/gemini-event', payload);
      await updateBadge(tracked, ok);
      sendResponse({ ok });
      return;
    }

    if (message?.type === 'POPUP_STATUS') {
      const ok = await checkBridgeHealth();
      const tracked = await pruneClosedTabs();
      await updateBadge(tracked, ok);
      const bridgeUrl = await getBridgeUrl();
      sendResponse({
        ok,
        bridgeUrl,
        tabs: Object.values(tracked),
      });
      return;
    }

    if (message?.type === 'RECONNECT_SYNC') {
      const ok = await checkBridgeHealth();
      const tracked = await pruneClosedTabs();
      for (const tabPayload of Object.values(tracked)) {
        await postToBridge('/api/gemini-event', {
          ...tabPayload,
          ts: Date.now(),
        });
      }
      await updateBadge(tracked, ok);
      const bridgeUrl = await getBridgeUrl();
      sendResponse({
        ok,
        bridgeUrl,
        tabs: Object.values(tracked),
      });
      return;
    }

    sendResponse({ ok: false });
  })();

  return true;
});
