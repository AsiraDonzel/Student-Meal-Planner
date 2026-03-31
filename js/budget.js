/**
 * budget.js – Handles static budget constraints and actual Dynamic Spending snapshot
 */
const Budget = (() => {
  function logPurchase(item, cost, date = new Date().toISOString()) {
    const state = App.getState();
    const history = state.spendingHistory || [];
    history.push({ item, cost, date });
    App.updateState({ spendingHistory: history });
    compute();
    if(window.AudioSystem) AudioSystem.playSound('chaching');
    showToast(`Logged purchase: ${item} (₦${Math.round(cost).toLocaleString()})`, 'success');
  }

  function resetSpending() {
    if(!confirm("Are you sure you want to reset your spending history? This does not alter your static allowance settings!")) return;
    App.updateState({ spendingHistory: [] });
    compute();
  }

  function compute() {
    const state = App.getState();
    const allowance = parseFloat(state.allowance) || 0;
    const savings   = parseFloat(state.savingsGoal) || 0;
    const misc      = parseFloat(state.miscExpenses) || 0;
    const history   = state.spendingHistory || [];
    
    // Base Spending Pool: allowance minus savings minus misc expenses
    const spendingBudget = Math.max(0, allowance - savings - misc);

    let daysTotal = 30, daysLeft = 30;
    if (state.budgetStartDate && state.budgetEndDate) {
      const start = new Date(state.budgetStartDate);
      const end = new Date(state.budgetEndDate);
      const now = new Date();
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);
      now.setHours(0,0,0,0);
      daysTotal = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
      daysLeft  = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
    }

    const totalSpent = history.reduce((a, b) => a + Number(b.cost), 0);
    const moneyLeft = Math.max(0, spendingBudget - totalSpent);
    const avgLeft = daysLeft > 0 ? moneyLeft / daysLeft : 0;
    const percentUsed = spendingBudget > 0 ? Math.min(100, Math.round((totalSpent / spendingBudget) * 100)) : 0;

    // Default DOM Updates
    const remainingEl = document.getElementById('remaining-display');
    const dailyEl = document.getElementById('daily-display');
    
    if (remainingEl) remainingEl.textContent = `₦${spendingBudget.toLocaleString()}`;
    if (dailyEl) dailyEl.textContent = `₦${(spendingBudget / daysTotal).toLocaleString(undefined, {maximumFractionDigits:0})}`;

    // Snapshot Widget DOM
    const snapRem = document.getElementById('snapshot-remaining');
    if (snapRem) {
      snapRem.textContent = `₦${moneyLeft.toLocaleString()} left`;
      document.getElementById('snapshot-days').textContent = daysLeft;
      document.getElementById('snapshot-avg').textContent = `₦${avgLeft.toLocaleString(undefined, {maximumFractionDigits:0})}`;
      
      const gauge = document.getElementById('snapshot-gauge');
      const pctTxt = document.getElementById('snapshot-percent');
      
      gauge.setAttribute('stroke-dasharray', `${percentUsed}, 100`);
      pctTxt.textContent = `${percentUsed}%`;
      
      if (percentUsed > 80) gauge.setAttribute('stroke', 'var(--red)');
      else if (percentUsed > 50) gauge.setAttribute('stroke', 'var(--orange)');
      else gauge.setAttribute('stroke', 'var(--green)');
    }

    // ── LOW-BUDGET WARNING LOGIC ──
    // Proactively alert the student if they reach the 30% budget threshold
    // and suggest using their stored staples to save money.
    const warningEl = document.getElementById('budget-warning');
    const warningLeftEl = document.getElementById('warning-budget-left');
    
    if (warningEl && warningLeftEl) {
      const staples = state.stapleItems || { hasGarri: false, hasCereal: false };
      const hasAnyStaple = staples.hasGarri || staples.hasCereal;
      
      // Threshold: 70% of allowance spent (30% remaining)
      if (percentUsed >= 70 && hasAnyStaple) {
        warningEl.classList.remove('hidden');
        warningLeftEl.textContent = moneyLeft.toLocaleString();
      } else {
        warningEl.classList.add('hidden');
      }
    }
  }

  function getSnapshot() {
    const state = App.getState();
    const allowance = parseFloat(state.allowance) || 0;
    const savings   = parseFloat(state.savingsGoal) || 0;
    const misc      = parseFloat(state.miscExpenses) || 0;
    const history   = state.spendingHistory || [];
    const spendingBudget = Math.max(0, allowance - savings - misc);
    const totalSpent = history.reduce((a, b) => a + Number(b.cost), 0);
    const moneyLeft = Math.max(0, spendingBudget - totalSpent);
    
    return { moneyLeft, spendingBudget, totalSpent };
  }

  function init() {
    compute();
    const btn = document.getElementById('snapshot-reset');
    if (btn) btn.addEventListener('click', resetSpending);
  }

  return { init, compute, logPurchase, resetSpending, getSnapshot, getHistory: () => App.getState().spendingHistory || [] };
})();
