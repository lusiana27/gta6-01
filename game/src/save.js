// Solara City — saving to localStorage.
//
// Progress is small: which mission Milo is on, how much cash he has, and
// his best haul. The save is written after every finished job, so a
// refresh never loses a completed mission.

SC.SAVE_KEY = 'solara-city-save-v1';

SC.saveGame = (G) => {
  try {
    const data = {
      missionIndex: G.missionIndex,
      cash: G.cash,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SC.SAVE_KEY, JSON.stringify(data));
  } catch {
    /* storage may be unavailable; the game still runs */
  }
};

SC.loadSave = () => {
  try {
    const raw = window.localStorage.getItem(SC.SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.missionIndex !== 'number' || typeof data.cash !== 'number') return null;
    return data;
  } catch {
    return null;
  }
};

SC.saveBest = (G) => {
  try {
    const key = 'solara-city-best-v1';
    const prev = Number(window.localStorage.getItem(key) || 0);
    if (G.cash > prev) window.localStorage.setItem(key, String(G.cash));
  } catch {
    /* ignore */
  }
};

SC.loadBest = () => {
  try {
    return Number(window.localStorage.getItem('solara-city-best-v1') || 0);
  } catch {
    return 0;
  }
};

SC.clearSave = () => {
  try {
    window.localStorage.removeItem(SC.SAVE_KEY);
  } catch {
    /* ignore */
  }
};
