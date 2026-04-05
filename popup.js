(() => {
  "use strict";

  const STORAGE_KEY = "lyricsTraditionalConvert";
  const DEFAULT_CONFIG = Object.freeze({ mode: "off" });

  const modeOff = document.getElementById("modeOff");
  const modeS2t = document.getElementById("modeS2t");
  const modeT2s = document.getElementById("modeT2s");
  const statusText = document.getElementById("statusText");

  const normalizeConfig = (config = {}) => {
    const m = config.mode;
    if (m === "s2t" || m === "t2s") return { mode: m };
    return { mode: "off" };
  };

  const setStatus = (mode) => {
    if (mode === "s2t") {
      statusText.textContent = "已启用：歌词将显示为繁体中文（台湾）。";
    } else if (mode === "t2s") {
      statusText.textContent = "已启用：歌词将显示为简体中文。";
    } else {
      statusText.textContent = "已关闭：歌词保持应用内原始显示。";
    }
    statusText.className = "status success";
  };

  const readConfig = () => new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (result = {}) => {
      resolve(normalizeConfig(result[STORAGE_KEY] || DEFAULT_CONFIG));
    });
  });

  const writeConfig = (config) => new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: normalizeConfig(config) }, resolve);
  });

  const render = (config) => {
    modeOff.checked = config.mode === "off";
    modeS2t.checked = config.mode === "s2t";
    modeT2s.checked = config.mode === "t2s";
  };

  const init = async () => {
    const config = await readConfig();
    render(config);
    setStatus(config.mode);
  };

  const onModeChange = async () => {
    let mode = "off";
    if (modeS2t.checked) mode = "s2t";
    else if (modeT2s.checked) mode = "t2s";
    const next = { mode };
    await writeConfig(next);
    render(next);
    setStatus(mode);
  };

  modeOff.addEventListener("change", onModeChange);
  modeS2t.addEventListener("change", onModeChange);
  modeT2s.addEventListener("change", onModeChange);

  init();
})();
