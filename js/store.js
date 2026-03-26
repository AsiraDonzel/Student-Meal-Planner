/**
 * store.js – localStorage CRUD for food items, settings, and history.
 *
 * All data is persisted under the "smp_" namespace.
 */

const Store = (() => {
  const KEYS = {
    FOOD_ITEMS: 'smp_food_items',
    SETTINGS: 'smp_settings',
    HISTORY: 'smp_history',
  };

  // ── Default food items (school cafeteria) ──
  const DEFAULT_FOOD_ITEMS = [
    { id: '1',  name: 'Bread & Egg',                price: 300,  category: 'healthy',   meal: 'breakfast' },
    { id: '2',  name: 'Custard & Akara',             price: 350,  category: 'healthy',   meal: 'breakfast' },
    { id: '3',  name: 'Tea & Bread with Butter',     price: 200,  category: 'moderate',  meal: 'breakfast' },
    { id: '4',  name: 'Rice & Chicken Stew',         price: 700,  category: 'healthy',   meal: 'lunch' },
    { id: '5',  name: 'Jollof Rice & Plantain',      price: 600,  category: 'moderate',  meal: 'lunch' },
    { id: '6',  name: 'Beans & Plantain',            price: 400,  category: 'healthy',   meal: 'lunch' },
    { id: '7',  name: 'Eba & Egusi Soup',            price: 500,  category: 'healthy',   meal: 'dinner' },
    { id: '8',  name: 'Spaghetti & Meatballs',       price: 650,  category: 'moderate',  meal: 'dinner' },
    { id: '9',  name: 'Indomie & Egg',               price: 350,  category: 'unhealthy', meal: 'any' },
    { id: '10', name: 'Soft Drink (Coke/Fanta)',      price: 200,  category: 'unhealthy', meal: 'snack' },
    { id: '11', name: 'Fruit Salad',                 price: 300,  category: 'healthy',   meal: 'snack' },
    { id: '12', name: 'Chin-Chin & Zobo',            price: 250,  category: 'moderate',  meal: 'snack' },
  ];

  const DEFAULT_SETTINGS = {
    allowance: 50000,
    savingsGoal: 10000,
    daysInMonth: 30,
    apiKey: '',
    proxyUrl: '',
  };

  // ── Helpers ──
  function _get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function _set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // ── Food Items ──
  function getItems() {
    return _get(KEYS.FOOD_ITEMS, DEFAULT_FOOD_ITEMS);
  }

  function setItems(items) {
    _set(KEYS.FOOD_ITEMS, items);
  }

  function addItem(item) {
    const items = getItems();
    item.id = Date.now().toString();
    items.push(item);
    setItems(items);
    return items;
  }

  function updateItem(id, updates) {
    const items = getItems().map(i => i.id === id ? { ...i, ...updates } : i);
    setItems(items);
    return items;
  }

  function deleteItem(id) {
    const items = getItems().filter(i => i.id !== id);
    setItems(items);
    return items;
  }

  // ── Settings ──
  function getSettings() {
    return { ...DEFAULT_SETTINGS, ..._get(KEYS.SETTINGS, {}) };
  }

  function setSettings(updates) {
    const current = getSettings();
    _set(KEYS.SETTINGS, { ...current, ...updates });
  }

  // ── History ──
  function getHistory() {
    return _get(KEYS.HISTORY, []);
  }

  function addHistory(entry) {
    const history = getHistory();
    entry.id = Date.now().toString();
    entry.date = new Date().toISOString();
    history.unshift(entry); // newest first
    // Keep max 20 entries
    if (history.length > 20) history.pop();
    _set(KEYS.HISTORY, history);
    return history;
  }

  function clearHistory() {
    _set(KEYS.HISTORY, []);
  }

  // ── Seed defaults on first run ──
  function init() {
    const existing = localStorage.getItem(KEYS.FOOD_ITEMS);
    // Re-seed if first run OR if cached items still have old USD prices (price < 10)
    if (!existing) {
      setItems(DEFAULT_FOOD_ITEMS);
    } else {
      try {
        const items = JSON.parse(existing);
        if (items.length > 0 && items[0].price < 10) {
          // Old dollar-based data — replace with Naira items
          setItems(DEFAULT_FOOD_ITEMS);
        }
      } catch { /* ignore parse errors */ }
    }
  }

  return {
    getItems, setItems, addItem, updateItem, deleteItem,
    getSettings, setSettings,
    getHistory, addHistory, clearHistory,
    init,
  };
})();
