/**
 * settings.js – Manages the dedicated Settings view.
 */

const Settings = (() => {
  let viewEl, dashboardEl;

  function init() {
    viewEl = document.getElementById('settings-view');
    dashboardEl = document.getElementById('main-view');

    // Navigation
    const settingsBtn = document.getElementById('settings-btn');
    const backBtn = document.getElementById('settings-back-btn');

    settingsBtn.addEventListener('click', openSettings);
    if (backBtn) backBtn.addEventListener('click', closeSettings);

    // Budget Configuration
    const saveBudgetBtn = document.getElementById('settings-save-budget');
    saveBudgetBtn.addEventListener('click', saveBudgetSettings);

    // Theme handling is now purely managed by js/theme.js dropdown change listeners.

    // Data Management
    document.getElementById('export-data-btn').addEventListener('click', exportData);
    document.getElementById('import-data-file').addEventListener('change', importData);
    document.getElementById('reset-data-btn').addEventListener('click', resetData);

    // Food Defaults
    document.getElementById('reset-food-btn').addEventListener('click', resetFoodDefaults);

    // Profile Management
    document.getElementById('save-profile-btn').addEventListener('click', saveProfile);
    
    // Security Center
    const rotateBtn = document.getElementById('rotate-master-password-btn');
    if (rotateBtn) rotateBtn.addEventListener('click', rotateMasterPassword);

    const resetBtn = document.getElementById('reset-data-btn');
    if (resetBtn) resetBtn.addEventListener('click', resetData);
  }



  function openSettings() {
    dashboardEl.classList.add('hidden');
    viewEl.classList.remove('hidden');

    // Populate Budget Inputs
    const state = App.getState();
    document.getElementById('set-allowance').value = state.allowance || 0;
    document.getElementById('set-savings').value   = state.savingsGoal || 0;
    document.getElementById('set-misc').value       = state.miscExpenses || 0;

    const startInput = document.getElementById('set-start-date');
    const endInput   = document.getElementById('set-end-date');

    const dNow = new Date();
    const dFuture = new Date(); dFuture.setDate(dNow.getDate() + 30);
    
    startInput.value = (state.budgetStartDate) ? new Date(state.budgetStartDate).toISOString().split('T')[0] : dNow.toISOString().split('T')[0];
    endInput.value   = (state.budgetEndDate) ? new Date(state.budgetEndDate).toISOString().split('T')[0] : dFuture.toISOString().split('T')[0];

    // Populate Profile
    document.getElementById('profile-name').value = state.userProfile.username || 'Student';
  }

  async function saveProfile() {
    try {
      const name = document.getElementById('profile-name').value.trim() || 'Student';
      const initial = name.charAt(0).toUpperCase();
      
      App.updateState({ 
        userProfile: { username: name, avatar: initial } 
      });

      // Update UI 
      const navInitial = document.getElementById('nav-profile-initial');
      if (navInitial) navInitial.textContent = initial;
      const welcomeName = document.getElementById('user-display-name');
      if (welcomeName) welcomeName.textContent = name;

      showToast('Profile updated!', 'success');
      if(window.AudioSystem) window.AudioSystem.playSound('chaching');
    } catch(err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  async function rotateMasterPassword() {
    const currentPass = prompt("Enter CURRENT Master Password:");
    if (!currentPass) return;

    const success = await Security.unlock(currentPass);
    if (!success) {
      alert("Incorrect password. Cannot change master key.");
      return;
    }

    const newPass = prompt("Enter NEW Master Password (at least 4 chars):");
    if (!newPass || newPass.length < 4) {
      alert("Invalid new password.");
      return;
    }

    const confirmPass = prompt("Confirm NEW Master Password:");
    if (newPass !== confirmPass) {
      alert("Passwords do not match.");
      return;
    }

    // Re-encrypt with new key
    await Security.setup(newPass);
    await Security.saveAppState(App.getState());
    showToast('Master Password rotated successfully!', 'success');
  }

  function closeSettings() {
    viewEl.classList.add('hidden');
    dashboardEl.classList.remove('hidden');
  }

  async function saveBudgetSettings() {
    try {
      const allowance = parseFloat(document.getElementById('set-allowance').value) || 0;
      const savingsGoal = parseFloat(document.getElementById('set-savings').value) || 0;
      const miscExpenses = parseFloat(document.getElementById('set-misc').value) || 0;
      const budgetStartDate = document.getElementById('set-start-date').value;
      const budgetEndDate   = document.getElementById('set-end-date').value;

      App.updateState({ allowance, savingsGoal, miscExpenses, budgetStartDate, budgetEndDate });
      
      Budget.compute(); 
      showToast('Budget settings saved to secure vault!', 'success');
    } catch(err) {
      showToast('Error saving settings: ' + err.message, 'error');
    }
  }

  // ── Data Management ── //

  async function exportData() {
    try {
      const u = JSON.parse(localStorage.getItem('smp_user')) || {};
      const foodRes = await API.request('/food');
      const exportObj = {
        user: u,
        foods: foodRes.data || [],
        history: JSON.parse(localStorage.getItem(`history_${u.id}`)) || [],
        theme: document.body.dataset.theme
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `smp_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      showToast('Data exported!', 'success');
    } catch(err) {
      showToast('Failed to export data.', 'error');
    }
  }

  function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm('Are you sure? This will OVERWRITE your current settings and foods!')) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        
        // 1. Update Profile (Allowance, settings)
        if (imported.user) {
          const { allowance, savingsGoal, budgetStartDate, budgetEndDate } = imported.user;
          const uRes = await API.request('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify({ allowance, savingsGoal, budgetStartDate, budgetEndDate })
          });
          localStorage.setItem('smp_user', JSON.stringify(uRes.user));
        }

        // 2. Erase existing foods & Insert new from JSON
        const foodRes = await API.request('/food');
        const oldFoods = foodRes.data || [];
        for (const f of oldFoods) {
           await API.request(`/food/${f._id}`, { method: 'DELETE' });
        }
        
        if (imported.foods) {
          for (const nf of imported.foods) {
            await API.request('/food', { method: 'POST', body: JSON.stringify({ name: nf.name, price: nf.price }) });
          }
        }

        // 3. Restore Local history
        const u = JSON.parse(localStorage.getItem('smp_user')) || {};
        if (imported.history) {
          localStorage.setItem(`history_${u.id}`, JSON.stringify(imported.history));
        }

        if (imported.theme) {
          Theme.apply(imported.theme);
        }

        Budget.compute();
        Food.render();
        History.render();
        openSettings(); // Refresh inputs
        showToast('Data imported successfully!', 'success');
      } catch (err) {
        showToast('Invalid backup file or network error.', 'error');
      }
      e.target.value = ''; // Reset input
    };
    reader.readAsText(file);
  }

  function resetData() {
    if(!confirm('This will literally delete your encrypted vault and all history. Are you completely sure?')) return;
    Security.resetAll();
  }

  async function resetFoodDefaults() {
    if(!confirm('This will erase your current campus menu and install the original default items. Continue?')) return;
    try {
      // 1. Delete all
      const foodRes = await API.request('/food');
      const oldFoods = foodRes.data || [];
      for (const f of oldFoods) {
         await API.request(`/food/${f._id}`, { method: 'DELETE' });
      }

      // 2. Add defaults
      const defaults = [
        { name: 'Jollof Rice & Plantain', price: 600 },
        { name: 'Fried Rice & Turkey', price: 1200 },
        { name: 'Eba & Egusi Soup', price: 500 },
        { name: 'Amala & Ewedu', price: 550 },
        { name: 'Bread & Egg (Tea Bread)', price: 300 },
        { name: 'Indomie & Egg', price: 350 },
        { name: 'Shawarma', price: 1500 },
        { name: 'Meatpie', price: 250 },
        { name: 'Sausage Roll (Gala)', price: 150 },
        { name: 'Bottle of Coke', price: 200 },
        { name: 'Sachet Water (Pure Water)', price: 20 },
        { name: 'Fruit Salad / Smooothie', price: 800 }
      ];

      for (const df of defaults) {
        await API.request('/food', { method: 'POST', body: JSON.stringify(df) });
      }

      Food.render();
      showToast('Default campus menu restored!', 'success');
    } catch(err) {
      showToast('Failed to reset foods.', 'error');
    }
  }

  return { init };
})();
