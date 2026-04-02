/**
 * app.js – Application initializer.
 */

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  
  container.appendChild(toast);
  
  // Slide in is handled by CSS animation
  
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}

const App = (() => {
  let appState = {
    allowance: 0,
    savingsGoal: 0,
    miscExpenses: 0,
    packPrice: 200,
    foodItems: [],
    spendingHistory: [],
    savedWeeklyPlan: null,
    userProfile: { username: 'Student', avatar: 'S' },
    theme: 'dark',
    stapleItems: { hasGarri: false, hasCereal: false }
  };

  async function init() {
    // 1. Initialize Theme early (from raw localStorage for fast paint, or default)
    Theme.init();
    if (window.AudioSystem) AudioSystem.init();
    
    // 2. Start Authentication Flow first
    Auth.init();
  }

  async function loginInit() {
    document.getElementById('auth-container').classList.add('hidden');

    // Attempt auto-unlock without asking for password if within 1 hour
    if (Security.isSetup()) {
      const autoSuccess = await Security.autoUnlock();
      if (autoSuccess) {
        return finishLoginInit();
      }
    }

    // Show Lock Screen overlay
    const lockScreen = document.getElementById('app-lock-screen');
    const lockForm   = document.getElementById('master-password-form');
    let newLockForm  = lockForm.cloneNode(true);
    lockForm.parentNode.replaceChild(newLockForm, lockForm);

    const lockTitle  = document.getElementById('lock-title');
    const lockSub    = document.getElementById('lock-subtitle');
    const setupInfo  = document.getElementById('master-setup-info');
    const unlockText = document.getElementById('master-unlock-text');

    lockScreen.classList.remove('hidden');
    document.getElementById('master-password-input').value = '';

    if (!Security.isSetup()) {
      // Setup Phase
      lockTitle.textContent = "Secure Your Planner";
      lockSub.textContent = "Set a master password to encrypt your data";
      setupInfo.classList.remove('hidden');
      unlockText.textContent = "Complete Setup";
      
      newLockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pass = document.getElementById('master-password-input').value;
        if (pass.length < 4) {
          showToast('Password must be at least 4 characters', 'error');
          return;
        }

        const legacy = Security.getLegacyData();
        if (legacy) {
          appState = { ...appState, ...legacy };
          showToast('Importing existing data into secure vault...', 'info');
        }

        await Security.setup(pass);
        await Security.saveAppState(appState);
        Security.clearLegacyData();
        
        lockScreen.classList.add('hidden');
        showToast('Secure vault created!', 'success');
        finishLoginInit();
      });
    } else {
      // Unlock Phase
      lockTitle.textContent = "Vault Locked";
      lockSub.textContent = "Enter your master password to decrypt your data";
      setupInfo.classList.add('hidden');
      unlockText.textContent = "Unlock Vault";

      newLockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pass = document.getElementById('master-password-input').value;
        const success = await Security.unlock(pass);
        
        if (success) {
          lockScreen.classList.add('hidden');
          showToast('Vault unlocked!', 'success');
          if(window.AudioSystem) window.AudioSystem.playSound('click');
          finishLoginInit();
        } else {
          const err = document.getElementById('master-lock-error');
          err.classList.remove('hidden');
          setTimeout(() => err.classList.add('hidden'), 3000);
        }
      });
    }
  }

  async function finishLoginInit() {
    const loaded = await Security.loadAppState();
    if (loaded) appState = loaded;
    if (appState.theme) Theme.apply(appState.theme);

    document.getElementById('app-container').classList.remove('hidden');


    // Init sub-modules
    Budget.init();
    Food.init();
    AI.init();
    History.init();
    Settings.init();

    // Personalization
    const prof = appState.userProfile || { username: 'Student', avatar: 'S' };
    const welcomeName = document.getElementById('user-display-name');
    if (welcomeName) welcomeName.textContent = prof.username;

    // Navbar Initials
    const navInitial = document.getElementById('nav-profile-initial');
    if (navInitial) navInitial.textContent = (prof.username || 'S').charAt(0).toUpperCase();

    // ── STAPLE ITEMS INTERACTIVITY ──
    // This allows students to indicate pre-purchased items (Garri, Cereal)
    // which the AI treats as ₦0 cost to stretch the budget during "sapa".
    const garriCheck = document.getElementById('staple-garri');
    const cerealCheck = document.getElementById('staple-cereal');

    if (garriCheck && cerealCheck) {
      // Sync UI with current encrypted state
      const staples = appState.stapleItems || { hasGarri: false, hasCereal: false };
      garriCheck.checked = staples.hasGarri;
      cerealCheck.checked = staples.hasCereal;

      // Update state and re-encrypt on every change
      [garriCheck, cerealCheck].forEach(el => {
        el.addEventListener('change', () => {
          updateState({
            stapleItems: {
              hasGarri: garriCheck.checked,
              hasCereal: cerealCheck.checked
            }
          });
          showToast('Staple preferences saved!', 'success');
        });
      });
    }

    lucide.createIcons();
  }

  function logoutInit() {
    document.getElementById('auth-container').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
    
    // Clear session-level unlock tokens
    sessionStorage.removeItem('smp_session');
    
    // Clear any sensitive initials if needed
    const navInitial = document.getElementById('nav-profile-initial');
    if (navInitial) navInitial.textContent = '';
  }

  function getState() { return appState; }
  function updateState(newPartial) { 
    appState = { ...appState, ...newPartial }; 
    Security.saveAppState(appState);
  }

  return { init, loginInit, logoutInit, getState, updateState };
})();

document.addEventListener('DOMContentLoaded', App.init);
