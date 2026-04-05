(() => {
  "use strict";

  const STORAGE_KEY = "lyricsTraditionalConvert";
  const DEFAULT_CONFIG = Object.freeze({ mode: "off" });
  const DS_LINE = "mkconvLine";
  const DS_TEXT = "mkconvText";

  let currentMode = "off";
  let s2tConv;
  let t2sConv;
  let rafId = 0;
  let isApplying = false;

  const normalizeConfig = (config = {}) => {
    const m = config.mode;
    if (m === "s2t" || m === "t2s") return { mode: m };
    return { mode: "off" };
  };

  const getConverters = () => {
    if (typeof OpenCC === "undefined") return null;
    if (!s2tConv) {
      s2tConv = OpenCC.Converter({ from: "cn", to: "tw" });
      t2sConv = OpenCC.Converter({ from: "tw", to: "cn" });
    }
    return { s2t: s2tConv, t2s: t2sConv };
  };

  const convert = (text, mode) => {
    if (!text || mode === "off") return text;
    const conv = getConverters();
    if (!conv) return text;
    return mode === "s2t" ? conv.s2t(text) : conv.t2s(text);
  };

  /**
   * @param {HTMLElement} el
   * @param {string} dataKey - dataset 键（camelCase，不含 data 前缀）
   * @param {string} current - 当前 DOM 文本
   * @param {string} mode
   */
  const syncSource = (el, dataKey, current, mode) => {
    let src = el.dataset[dataKey];
    if (src === undefined) {
      el.dataset[dataKey] = current;
      src = current;
    }
    const expected = mode === "off" ? src : convert(src, mode);
    if (current === expected) {
      return src;
    }
    if (current !== src && current !== expected) {
      el.dataset[dataKey] = current;
      src = current;
    }
    return src;
  };

  const applyPlainText = (el, mode) => {
    if (!(el instanceof HTMLElement)) return;
    const cur = el.textContent || "";
    const src = syncSource(el, DS_TEXT, cur, mode);
    const out = mode === "off" ? src : convert(src, mode);
    if (el.textContent !== out) {
      el.textContent = out;
    }
  };

  const applyLineGroupMain = (group, mode) => {
    const lineEl = group.querySelector(".line:not(.translated):not(.romanized)");
    if (!lineEl) return;
    const chars = [...lineEl.querySelectorAll(".char")];
    if (!chars.length) return;

    const currentJoined = chars.map((c) => c.textContent).join("");
    const src = syncSource(group, DS_LINE, currentJoined, mode);
    const out = mode === "off" ? src : convert(src, mode);

    const outChars = [...out];
    if (outChars.length === chars.length) {
      outChars.forEach((ch, i) => {
        if (chars[i].textContent !== ch) chars[i].textContent = ch;
      });
      return;
    }

    chars.forEach((span) => {
      const s = span.textContent || "";
      const o = mode === "off" ? s : convert(s, mode);
      if (span.textContent !== o) span.textContent = o;
    });
  };

  const applyDesktopLyricsText = (wrap, mode) => {
    const layers = [...wrap.querySelectorAll(".lyrics-layer")];
    if (!layers.length) return;
    const cur = layers[0].textContent || "";
    const src = syncSource(wrap, DS_TEXT, cur, mode);
    const out = mode === "off" ? src : convert(src, mode);
    layers.forEach((layer) => {
      if (layer.textContent !== out) layer.textContent = out;
    });
  };

  const run = () => {
    if (isApplying) return;
    if (typeof OpenCC === "undefined") return;

    isApplying = true;
    try {
      const mode = currentMode;

      document.querySelectorAll("#lyrics .line-group").forEach((group) => {
        applyLineGroupMain(group, mode);

        const tr = group.querySelector(".line.translated");
        if (tr) applyPlainText(tr, mode);

        const ro = group.querySelector(".line.romanized");
        if (ro) applyPlainText(ro, mode);
      });

      document.querySelectorAll(".lyrics-content-wrapper .lyrics-text").forEach((wrap) => {
        if (wrap.closest(".nolyrics")) return;
        applyDesktopLyricsText(wrap, mode);
      });
    } finally {
      isApplying = false;
    }
  };

  const schedule = () => {
    if (rafId) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = 0;
      run();
    });
  };

  const readConfig = () => new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (result = {}) => {
      resolve(normalizeConfig(result[STORAGE_KEY] || DEFAULT_CONFIG));
    });
  });

  const initConfig = async () => {
    currentMode = (await readConfig()).mode;
    schedule();
  };

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[STORAGE_KEY]) return;
    currentMode = normalizeConfig(changes[STORAGE_KEY].newValue || DEFAULT_CONFIG).mode;
    schedule();
  });

  const observer = new MutationObserver(() => {
    schedule();
  });

  const startObserver = () => {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });
  };

  window.addEventListener("hashchange", schedule, { passive: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initConfig();
      startObserver();
    }, { once: true });
  } else {
    initConfig();
    startObserver();
  }
})();
