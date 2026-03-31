/**
 * ai.js – Groq AI integration, Weekly Calendar Drag-Drop, Cafeteria Analytics
 */

const AI = (() => {
  let currentPlan = null;
  let draggedMealInfo = null; // { dIdx, mType, data }

  async function getRecommendation(isSurprise = false) {
    const foodItems = Food.getItems();
    if (foodItems.length === 0) {
      showToast('Add some food items first!', 'error');
      return null;
    }

    const loadingEl = document.getElementById('ai-loading');
    const resultEl  = document.getElementById('ai-result');
    const errorEl   = document.getElementById('ai-error');
    const clearBtn  = document.getElementById('clear-plan-btn');
    
    // Custom loading text for surprise
    const pTag = loadingEl.querySelector('p');
    if(pTag) pTag.textContent = isSurprise ? "Mixing up something surprising ✨..." : "Analyzing your menu & budget…";
    
    loadingEl.classList.remove('hidden');
    resultEl.classList.add('hidden');
    errorEl.classList.add('hidden');
    if(clearBtn) clearBtn.classList.add('hidden');
    const cafBtnWrapper = document.getElementById('cafeteria-btn-wrapper');
    if(cafBtnWrapper) cafBtnWrapper.classList.add('hidden');

    try {
      if(window.AudioSystem) window.AudioSystem.playSound('click');
      const state = App.getState();
      const staples = state.stapleItems || { hasGarri: false, hasCereal: false };

      // ── AI PROMPT AUGMENTATION ──
      // Injecting staple availability and current budget constraints.
      // The AI is instructed to treat these staples as ₦0 cost meal bases.
      const promptPayload = {
        mode: isSurprise ? 'surprise' : 'normal',
        staples: {
          garri: staples.hasGarri ? 'Yes' : 'No',
          cereal: staples.hasCereal ? 'Yes' : 'No'
        },
        constraints: {
          allowance: state.allowance,
          savingsGoal: state.savingsGoal,
          currentFunds: Budget.getSnapshot().moneyLeft
        }
      };
      
      const res = await API.request('/ai/recommend', {
        method: 'POST',
        body: JSON.stringify(promptPayload)
      });

      currentPlan = res.data;
      
      // ── DATE STAMPING ──
      // Assign real dates to each day based on the budget start date
      const state2 = App.getState();
      const startDate = state2.budgetStartDate ? new Date(state2.budgetStartDate) : new Date();
      const now = new Date();
      
      // Calculate which week we're in relative to budget start
      const daysSinceStart = Math.max(0, Math.floor((now - startDate) / (1000 * 60 * 60 * 24)));
      const currentWeekNum = Math.floor(daysSinceStart / 7) + 1;
      
      // Find the Monday of the current week (or the start of the 7-day block)
      const weekStartDate = new Date(startDate);
      weekStartDate.setDate(weekStartDate.getDate() + (currentWeekNum - 1) * 7);
      
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      
      if (currentPlan.weekly_plan) {
        currentPlan.weekly_plan.forEach((day, i) => {
          const d = new Date(weekStartDate);
          d.setDate(d.getDate() + i);
          day.date = `${dayNames[d.getDay()]}, ${monthNames[d.getMonth()]} ${d.getDate()}`;
          day.isoDate = d.toISOString().split('T')[0]; // e.g., "2026-03-31"
        });
        currentPlan.weekLabel = `Week ${currentWeekNum}`;
      }
      
      // Initialize meal usage log (tracks which meals the user actually followed)
      const mealUsageLog = state2.mealUsageLog || {};
      // Don't reset — keep previous weeks' data
      
      App.updateState({ savedWeeklyPlan: currentPlan, mealUsageLog });
      
      displayResult();

      // Log to history in App state
      const historyLog = state.aiHistory || [];
      historyLog.unshift({ id: Date.now().toString(), date: new Date().toISOString(), plan: currentPlan });
      if (historyLog.length > 20) historyLog.pop();
      App.updateState({ aiHistory: historyLog });
      
      History.render();
      
      if(window.AudioSystem) window.AudioSystem.playSound('chaching');
      return currentPlan;
    } catch (err) {
      console.error('AI Error:', err);
      errorEl.textContent = `⚠️ ${err.message}`;
      errorEl.classList.remove('hidden');
      showToast('Failed to get recommendation.', 'error');
      if(window.AudioSystem) window.AudioSystem.playSound('error');
      return null;
    } finally {
      loadingEl.classList.add('hidden');
    }
  }

  function displayResult() {
    if (!currentPlan) return;
    const plan = currentPlan;
    const appState = App.getState();
    const usageLog = appState.mealUsageLog || {};
    
    const resultEl  = document.getElementById('ai-result');
    const summaryEl = document.getElementById('ai-summary');
    const planEl    = document.getElementById('ai-plan');
    const adviceEl  = document.getElementById('ai-advice');

    // Calculate actual spent from usage log
    let actualSpent = 0;
    Object.values(usageLog).forEach(dayMeals => {
      Object.values(dayMeals).forEach(entry => {
        if (entry.used) actualSpent += (entry.cost || 0);
      });
    });

    // Summary cards
    const s = plan.summary || {};
    const mealsEmoji = s.recommended_meals_per_day === 1 ? '1️⃣' : s.recommended_meals_per_day === 2 ? '2️⃣' : '3️⃣';
    const weekLabel = plan.weekLabel || 'This Week';
    
    if(summaryEl) summaryEl.innerHTML = `
      <div class="ai-summary-card card-total" style="grid-column: 1 / -1; background: var(--bg-tertiary); border-left: 4px solid var(--accent);">
        <div class="ai-stat-label">📅 ${escapeHTML(weekLabel)}</div>
        <div class="ai-stat-value" style="font-size:1.2rem; color:var(--text-primary);">Planned: ₦${(s.total_weekly_cost || 0).toLocaleString()} · Actual Spent: <span style="color:var(--green);">₦${actualSpent.toLocaleString()}</span></div>
      </div>
      <div class="ai-summary-card card-total">
        <div class="ai-stat-label">Weekly Cost</div>
        <div class="ai-stat-value">₦${(s.total_weekly_cost || 0).toLocaleString()}</div>
      </div>
      <div class="ai-summary-card card-total">
        <div class="ai-stat-label">Monthly Projection</div>
        <div class="ai-stat-value">₦${(s.projected_monthly_cost || 0).toLocaleString()}</div>
      </div>
      <div class="ai-summary-card card-saved">
        <div class="ai-stat-label">Projected Savings</div>
        <div class="ai-stat-value">₦${(s.projected_savings || 0).toLocaleString()}</div>
      </div>
      <div class="ai-summary-card card-health">
        <div class="ai-stat-label">Health Score</div>
        <div class="ai-stat-value">${s.health_score_out_of_10 || '–'}/10</div>
      </div>
      <div class="ai-summary-card card-meals-per-day">
        <div class="ai-stat-label">${mealsEmoji} Meals / Day</div>
        <div class="ai-stat-value">${s.recommended_meals_per_day || 3}</div>
        <div class="ai-stat-reason">${escapeHTML(s.meals_per_day_reason || '')}</div>
      </div>`;

    // Weekly Calendar Render
    const week = plan.weekly_plan || [];
    if(planEl) planEl.innerHTML = week.map((day, dIdx) => {
      const mealTypes = ['breakfast', 'lunch', 'dinner'];
      const mealEmojis = { breakfast: '🌅', lunch: '☀️', dinner: '🌙' };
      const dateLabel = day.date || day.day;
      const isoDate = day.isoDate || `day-${dIdx}`;
      
      const mealsHtml = mealTypes.map(m => {
        const mObj = day[m];
        if (!mObj) return `
          <div class="plan-meal plan-meal-skip" style="opacity: 0.5; border-style: dashed;">
            <div class="plan-meal-type">${mealEmojis[m] || ''} ${m}</div>
            <div class="plan-meal-name" style="color:var(--text-muted); font-style:italic;">No data</div>
          </div>`;
        
        const isSkip = mObj.item && mObj.item.toLowerCase() === 'skip';
        const isFree = mObj.cost === 0 && !isSkip;
        
        // Check if this meal was already marked as used
        const usageKey = `${isoDate}_${m}`;
        const isUsed = usageLog[isoDate] && usageLog[isoDate][m] && usageLog[isoDate][m].used;
        
        if (isSkip) {
          return `
          <div class="plan-meal plan-meal-skip" style="opacity: 0.55; border-style: dashed; background: var(--bg-tertiary);">
            <div class="plan-meal-type">${mealEmojis[m] || ''} ${m}</div>
            <div class="plan-meal-name" style="color:var(--text-muted); font-style:italic; display:flex; align-items:center; gap:6px;">
              ⏭️ Skip this meal
              <span style="font-size:0.7rem; background:var(--orange-bg); color:var(--orange); padding:2px 8px; border-radius:50px;">SAVE</span>
            </div>
            <div class="plan-meal-cost" style="color:var(--text-muted);">₦0</div>
          </div>`;
        }
        
        const usedStyle = isUsed ? 'border-color: var(--green); background: rgba(0, 184, 148, 0.06);' : '';
        const nameStyle = isUsed ? 'text-decoration: line-through; opacity: 0.6;' : '';
        
        return `
          <div class="plan-meal" draggable="true" data-didx="${dIdx}" data-mtype="${m}" style="cursor: grab; position:relative; ${usedStyle}">
            <div style="display:flex; justify-content:space-between; align-items:start;">
              <div class="plan-meal-type">${mealEmojis[m] || ''} ${m}</div>
              <div style="display:flex; gap:4px; align-items:center;">
                <label class="meal-check-label" style="display:flex; align-items:center; gap:4px; cursor:pointer; font-size:0.7rem; color:${isUsed ? 'var(--green)' : 'var(--text-muted)'};">
                  <input type="checkbox" class="meal-used-checkbox" data-iso="${isoDate}" data-mtype="${m}" data-cost="${mObj.cost}" data-item="${escapeHTML(mObj.item)}" ${isUsed ? 'checked' : ''} style="accent-color:var(--green); width:16px; height:16px;">
                  ${isUsed ? '✅ Used' : 'Mark as used'}
                </label>
                <button class="icon-btn delete-meal-btn" data-didx="${dIdx}" data-mtype="${m}" title="Remove Meal" style="width:24px;height:24px; border:none; background:transparent;"><i data-lucide="trash-2" style="width:14px;height:14px;color:var(--red);"></i></button>
              </div>
            </div>
            <div class="plan-meal-name" style="margin-top:2px; ${nameStyle}">
              <div>${escapeHTML(mObj.item)}</div>
              ${mObj.cafeteria && mObj.cafeteria.trim() ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">📍 ${escapeHTML(mObj.cafeteria)}</div>` : ''}
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 8px;">
              <div class="plan-meal-cost" style="${isFree ? 'color:var(--green);' : ''}${isUsed ? 'color:var(--green);' : ''}">
                ${isFree ? '<span style="font-size:0.7rem; background:var(--green-bg); color:var(--green); padding:2px 8px; border-radius:50px; margin-right:4px;">FREE</span>' : ''}${isUsed ? '<span style="font-size:0.7rem; background:var(--green-bg); color:var(--green); padding:2px 8px; border-radius:50px; margin-right:4px;">SPENT</span>' : ''}₦${Number(mObj.cost).toLocaleString()}
              </div>
            </div>
          </div>`;
      }).join('');

      return `
        <div class="plan-day" data-didx="${dIdx}" ondragover="event.preventDefault();" style="transition: background 0.2s;">
          <div class="plan-day-header">
            <span class="plan-day-name">📆 ${escapeHTML(dateLabel)}</span>
            <span class="plan-day-total">₦${Number(day.daily_total).toLocaleString()}</span>
          </div>
          <div class="plan-meals droppable-zone">${mealsHtml}</div>
        </div>`;
    }).join('');

    // Attach Meal Usage Checkbox events
    document.querySelectorAll('.meal-used-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const iso = e.target.dataset.iso;
        const mType = e.target.dataset.mtype;
        const cost = parseFloat(e.target.dataset.cost) || 0;
        const item = e.target.dataset.item;
        const isChecked = e.target.checked;
        
        const state = App.getState();
        const log = state.mealUsageLog || {};
        
        // Initialize day if needed
        if (!log[iso]) log[iso] = {};
        
        if (isChecked) {
          // Mark as used and log the purchase
          log[iso][mType] = { used: true, cost, item };
          Budget.logPurchase(`${item} (${mType})`, cost);
          showToast(`✅ ${item} marked as used — ₦${cost.toLocaleString()} deducted`, 'success');
        } else {
          // Unmark — remove from usage log and reverse the cost
          if (log[iso][mType]) {
            delete log[iso][mType];
          }
          // Remove the corresponding entry from spending history
          const history = state.spendingHistory || [];
          const idx = history.findIndex(h => h.item === `${item} (${mType})` && h.cost === cost);
          if (idx > -1) history.splice(idx, 1);
          App.updateState({ spendingHistory: history });
          showToast(`↩️ ${item} unmarked — ₦${cost.toLocaleString()} restored`, 'info');
        }
        
        App.updateState({ mealUsageLog: log });
        Budget.compute();
        if(window.AudioSystem) window.AudioSystem.playSound('chaching');
        
        // Re-render to update visual state
        displayResult();
      });
    });

    // Attach Delete Meal events
    document.querySelectorAll('.delete-meal-btn').forEach(b => {
      b.addEventListener('click', (e) => {
        const dIdx = e.currentTarget.dataset.didx;
        const mType = e.currentTarget.dataset.mtype;
        delete currentPlan.weekly_plan[dIdx][mType];
        recalculateTotals();
        displayResult();
      });
    });

    // Attach Drag and Drop Events
    document.querySelectorAll('.plan-meal').forEach(el => {
      el.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', ''); 
        // Force the ghost image to hold content visually
        el.style.opacity = '0.4';
        
        draggedMealInfo = {
          dIdx: e.currentTarget.dataset.didx,
          mType: e.currentTarget.dataset.mtype,
          data: currentPlan.weekly_plan[e.currentTarget.dataset.didx][e.currentTarget.dataset.mtype]
        };
      });
      el.addEventListener('dragend', (e) => {
        el.style.opacity = '1';
      });
    });

    document.querySelectorAll('.plan-day').forEach(el => {
      el.addEventListener('dragover', e => {
        e.preventDefault();
        el.style.background = 'var(--accent-bg)';
      });
      el.addEventListener('dragleave', e => {
        el.style.background = '';
      });
      el.addEventListener('drop', e => {
        e.preventDefault();
        el.style.background = '';
        if (!draggedMealInfo) return;
        
        const targetDIdx = el.dataset.didx;
        if (targetDIdx === draggedMealInfo.dIdx) return;
        
        // Remove from source day
        const oldDay = currentPlan.weekly_plan[draggedMealInfo.dIdx];
        delete oldDay[draggedMealInfo.mType];
        
        // Push into target day slot
        const targetDay = currentPlan.weekly_plan[targetDIdx];
        const types = ['lunch', 'dinner', 'breakfast', 'snack'];
        let emptySlot = types.find(t => !targetDay[t]);
        if (!emptySlot) emptySlot = 'snack'; // Override snack if no slots available
        
        targetDay[emptySlot] = draggedMealInfo.data;
        draggedMealInfo = null;
        
        recalculateTotals();
        displayResult();
      });
    });

    // Advice
    if(adviceEl) adviceEl.innerHTML = `
      <h3><i data-lucide="lightbulb"></i> Health Advice</h3>
      <p class="ai-advice-text">${escapeHTML(plan.advice || '')}</p>`;

    if(resultEl) resultEl.classList.remove('hidden');
    const clearBtn = document.getElementById('clear-plan-btn');
    if(clearBtn) clearBtn.classList.remove('hidden');
    
    // Inject Cafeteria Button visually ahead of chart
    injectCafeteriaButton(resultEl);
    lucide.createIcons();
    ChartModule.update(week);
  }

  function recalculateTotals() {
    let globalTotal = 0;
    currentPlan.weekly_plan.forEach(day => {
      let dayTotal = 0;
      ['breakfast', 'lunch', 'dinner', 'snack'].forEach(m => {
        if (day[m]) dayTotal += Number(day[m].cost);
      });
      day.daily_total = dayTotal;
      globalTotal += dayTotal;
    });
    currentPlan.summary.total_weekly_cost = globalTotal;
    App.updateState({ savedWeeklyPlan: currentPlan });
  }

  function injectCafeteriaButton(container) {
    let btnContainer = document.getElementById('cafeteria-btn-wrapper');
    if (!btnContainer) {
      btnContainer = document.createElement('div');
      btnContainer.id = 'cafeteria-btn-wrapper';
      btnContainer.style.textAlign = 'center';
      btnContainer.style.marginTop = '24px';
      btnContainer.style.marginBottom = '16px';
      
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost';
      btn.innerHTML = `<i data-lucide="store"></i> Compare Cafeterias and Save <i data-lucide="arrow-right"></i>`;
      btn.onclick = analyzeCafeterias;
      
      btnContainer.appendChild(btn);
      
      const chart = document.querySelector('.chart-card');
      if (chart) chart.parentNode.insertBefore(btnContainer, chart);
      else if(container) container.appendChild(btnContainer);
    } else {
      btnContainer.classList.remove('hidden');
    }
  }

  function analyzeCafeterias() {
    const foodItems = Food.getItems();
    let analysisHtml = `<div style="overflow-x:auto;"><table style="width:100%; text-align:left; border-collapse: collapse; margin-top:16px;">
      <tr style="border-bottom: 1px solid var(--border);"><th style="padding:8px;">Meal</th><th style="padding:8px;">Current (Cheapest AI Pic)</th><th style="padding:8px;">Max Alternative Price</th><th style="padding:8px; text-align:right;">Savings Shielded</th></tr>`;
    
    let totalSavings = 0;
    let foundComparison = false;
    
    currentPlan.weekly_plan.forEach(day => {
      ['breakfast', 'lunch', 'dinner', 'snack'].forEach(m => {
        if (!day[m]) return;
        const itemObj = day[m];
        if (!itemObj.cafeteria) return; 
        
        const dbItem = foodItems.find(f => f.name.toLowerCase().includes(itemObj.item.toLowerCase()) || itemObj.item.toLowerCase().includes(f.name.toLowerCase()));
        if (!dbItem || !dbItem.prices || dbItem.prices.length < 2) return;
        
        const prices = dbItem.prices.map(p => Number(p.price));
        const maxPrice = Math.max(...prices);
        const currentCost = Number(itemObj.cost);
        
        if (maxPrice > currentCost) {
           foundComparison = true;
           const maxCaf = dbItem.prices.find(p => Number(p.price) === maxPrice).cafeteria;
           const savings = maxPrice - currentCost;
           totalSavings += savings;
           analysisHtml += `<tr style="border-bottom: 1px solid var(--border); font-size: 0.85rem;">
            <td style="padding:8px;">${escapeHTML(itemObj.item)}</td>
            <td style="padding:8px; color:var(--green);">₦${currentCost} <br><small>${escapeHTML(itemObj.cafeteria)}</small></td>
            <td style="padding:8px; color:var(--red);">₦${maxPrice} <br><small>${escapeHTML(maxCaf)}</small></td>
            <td style="padding:8px; font-weight:bold; text-align:right;">+₦${savings}</td>
           </tr>`;
        }
      });
    });
    
    analysisHtml += `</table></div>`;
    
    if (!foundComparison) {
       analysisHtml = `<div style="text-align:center; padding: 30px;"><i data-lucide="check-circle" style="width:40px;height:40px;color:var(--green);margin-bottom:12px;"></i><p>You're already highly optimized! Your AI algorithm selected perfectly optimized portion sources across campus ensuring ₦0 leakage.</p></div>`;
    } else {
       analysisHtml += `<div style="margin-top:20px; text-align:right; font-size:1.15rem; font-weight:bold; color:var(--green); background:var(--bg-tertiary); padding: 12px; border-radius: var(--radius-sm);">Total Avoided Waste: ₦${totalSavings.toLocaleString()}</div>`;
    }

    // Modal DOM Builder
    let modal = document.getElementById('cafeteria-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'cafeteria-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal w-full max-w-lg" style="max-width: 600px;">
          <div class="modal-header">
            <h3><i data-lucide="store" style="color:var(--accent);"></i> AI Cafeteria Matrix Analysis</h3>
            <button class="icon-btn" onclick="document.getElementById('cafeteria-modal').classList.add('hidden')"><i data-lucide="x"></i></button>
          </div>
          <div id="cafeteria-analysis-content" style="max-height: 50vh; overflow-y: auto;"></div>
        </div>`;
      document.body.appendChild(modal);
    }
    
    document.getElementById('cafeteria-analysis-content').innerHTML = analysisHtml;
    modal.classList.remove('hidden');
    lucide.createIcons();
    if(window.AudioSystem) window.AudioSystem.playSound('click');
  }

  function clearPlan() {
    if(!confirm("Are you sure you want to clear the entire weekly meal plan?")) return;
    currentPlan = null;
    App.updateState({ savedWeeklyPlan: null });
    document.getElementById('ai-result').classList.add('hidden');
    document.getElementById('clear-plan-btn').classList.add('hidden');
    showToast('Weekly plan cleared.', 'info');
    if(window.AudioSystem) window.AudioSystem.playSound('click');
  }

  function init() {
    const btn = document.getElementById('get-recommendation-btn');
    if(btn) {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener('click', () => getRecommendation(false));
    }
    
    const surpriseBtn = document.getElementById('surprise-btn');
    if(surpriseBtn) surpriseBtn.addEventListener('click', () => getRecommendation(true));

    const clearBtn = document.getElementById('clear-plan-btn');
    if(clearBtn) {
      clearBtn.addEventListener('click', clearPlan);
      // If a plan already exists in state, show the button
      const state = App.getState();
      if (state.savedWeeklyPlan) {
        clearBtn.classList.remove('hidden');
      } else {
        clearBtn.classList.add('hidden');
      }
    }

    // Restore saved plan from appState
    const state = App.getState();
    if (state.savedWeeklyPlan) {
      currentPlan = state.savedWeeklyPlan;
      displayResult();
    }
  }

  return { init, displayResult };
})();
