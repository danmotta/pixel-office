(() => {
  const CHECK_INTERVAL_MS = 600;
  const HEARTBEAT_MS = 5000;
  const TYPING_HOLD_MS = 3000;
  const DONE_HOLD_MS = 15000;

  let rafScheduled = false;
  let lastCheckAt = 0;
  let lastTypingAt = 0;
  let wasThinking = false;
  let doneUntil = 0;
  let lastResponseTextLen = 0;
  let lastGrowthAt = 0;
  let lastSentKey = '';
  let lastSentAt = 0;

  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function detectStopControl() {
    const selectors = [
      'button[aria-label*="Stop" i]',
      'button[aria-label*="Parar" i]',
      'button[aria-label*="Interromper" i]',
      'button[data-test-id*="stop" i]',
      '[aria-busy="true"]',
    ];
    for (const sel of selectors) {
      const nodes = document.querySelectorAll(sel);
      for (const node of nodes) {
        if (isVisible(node)) return true;
      }
    }
    return false;
  }

  function measureResponses() {
    const nodes = document.querySelectorAll(
      'model-response, .model-response-text, message-content'
    );
    let totalLen = 0;
    for (const n of nodes) {
      totalLen += (n.textContent || '').length;
    }
    return { count: nodes.length, totalLen };
  }

  function extractTitle() {
    const activeSidebar = document.querySelector(
      '[aria-current="page"], .conversation.selected, a[href*="/app/"][aria-selected="true"]'
    );
    if (activeSidebar && activeSidebar.textContent) {
      const t = activeSidebar.textContent.replace(/\s+/g, ' ').trim();
      if (t && t.length > 1) return t.slice(0, 80);
    }
    const raw = (document.title || 'Gemini Web')
      .replace(/\s*[-–|]\s*Google Gemini$/i, '')
      .replace(/^Google Gemini$/i, 'Gemini Web')
      .replace(/^Gemini$/i, 'Gemini Web')
      .trim();
    return (raw || 'Gemini Web').slice(0, 80);
  }

  function extractModel() {
    const candidates = document.querySelectorAll(
      '[data-test-id*="model" i], button[aria-label*="modelo" i], button[aria-label*="model" i], .logo-pill-label'
    );
    for (const el of candidates) {
      if (!isVisible(el)) continue;
      const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (txt && txt.length <= 36) return txt;
    }
    return 'Gemini Web';
  }

  function extractPromptPreview() {
    const input = document.querySelector('[contenteditable="true"], textarea');
    const draft = input ? (input.value || input.textContent || '').trim() : '';
    if (draft) return draft.replace(/\s+/g, ' ').slice(0, 160);

    const userQueries = document.querySelectorAll(
      'user-query, .user-query-container, [data-test-id*="user-query" i]'
    );
    if (userQueries.length > 0) {
      const last = userQueries[userQueries.length - 1];
      const text = (last.textContent || '').replace(/\s+/g, ' ').trim();
      if (text) return text.slice(0, 160);
    }
    return '';
  }

  async function sendState(force = false) {
    const now = Date.now();
    const { count, totalLen } = measureResponses();
    if (totalLen > lastResponseTextLen && lastResponseTextLen > 0) {
      lastGrowthAt = now;
    }
    lastResponseTextLen = totalLen;

    const stopVisible = detectStopControl();
    const activelyStreaming = stopVisible || now - lastGrowthAt < 1800;

    let state = 'idle';
    if (activelyStreaming) {
      state = 'thinking';
      wasThinking = true;
      doneUntil = 0;
    } else {
      if (wasThinking) {
        wasThinking = false;
        doneUntil = now + DONE_HOLD_MS;
      }
      if (now - lastTypingAt < TYPING_HOLD_MS) {
        state = 'typing';
      } else if (now < doneUntil) {
        state = 'done';
      } else {
        state = 'idle';
      }
    }

    const title = extractTitle();
    const model = extractModel();
    const promptPreview = extractPromptPreview();
    const url = window.location.href;
    const key = `${state}|${title}|${model}|${count}|${url}`;

    if (!force && key === lastSentKey && now - lastSentAt < HEARTBEAT_MS - 300) {
      return;
    }

    const eventType = key === lastSentKey ? 'heartbeat' : 'state_change';
    lastSentKey = key;
    lastSentAt = now;

    try {
      await chrome.runtime.sendMessage({
        type: 'GEMINI_STATE',
        payload: {
          event: eventType,
          state,
          title,
          model,
          url,
          promptPreview,
          responseCount: count,
          ts: now,
        },
      });
    } catch {
      // Extension context may be invalidated during reload
    }
  }

  function scheduleCheck() {
    if (rafScheduled) return;
    rafScheduled = true;
    requestAnimationFrame(() => {
      rafScheduled = false;
      const now = Date.now();
      if (now - lastCheckAt < CHECK_INTERVAL_MS) return;
      lastCheckAt = now;
      void sendState(false);
    });
  }

  document.addEventListener(
    'input',
    (e) => {
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.matches('[contenteditable="true"], textarea') ||
          target.closest('[contenteditable="true"]'))
      ) {
        lastTypingAt = Date.now();
        scheduleCheck();
      }
    },
    true
  );

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void sendState(true);
  });

  const observer = new MutationObserver(() => {
    scheduleCheck();
  });

  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-busy', 'aria-label', 'disabled'],
    });
  }

  setInterval(() => {
    void sendState(true);
  }, HEARTBEAT_MS);

  void sendState(true);
})();
