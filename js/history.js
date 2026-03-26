/**
 * history.js – Past AI recommendation history UI.
 * (Local history cache per user)
 */

const History = (() => {
  let listEl, emptyEl, clearBtn;

  function getHistory() {
    const state = App.getState();
    return state.aiHistory || [];
  }

  function clearHistory() {
    App.updateState({ aiHistory: [] });
  }

  function render() {
    const history = getHistory();

    emptyEl.classList.toggle('hidden', history.length > 0);
    clearBtn.classList.toggle('hidden', history.length === 0);

    if (history.length === 0) {
      listEl.querySelectorAll('.history-card').forEach(c => c.remove());
      return;
    }

    // Build cards
    const cards = history.map(entry => {
      const date = new Date(entry.date).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });

      const s = entry.plan?.summary || {};
      const week = entry.plan?.weekly_plan || [];

      // Condensed plan for collapsed view
      const planHTML = week.map(day => {
        const meals = ['breakfast', 'lunch', 'dinner', 'snack']
          .filter(m => day[m])
          .map(m => `<span>${m[0].toUpperCase() + m.slice(1)}: ${escapeHTML(day[m].item)} (₦${Number(day[m].cost).toLocaleString()})</span>`)
          .join(' · ');
        return `<div style="margin-bottom:6px;"><strong>${day.day}:</strong> ${meals} — <em>₦${Number(day.daily_total).toLocaleString()}</em></div>`;
      }).join('');

      return `
        <div class="history-card" data-id="${entry.id}">
          <div class="history-card-header">
            <div>
              <div class="history-card-date">${date}</div>
            </div>
            <div class="history-card-stats">
              <div>Cost: <span>₦${(s.total_weekly_cost || 0).toLocaleString()}/wk</span></div>
              <div>Health: <span>${s.health_score_out_of_10 || '–'}/10</span></div>
              <i data-lucide="chevron-down" class="history-chevron" style="width:18px;height:18px;color:var(--text-muted)"></i>
            </div>
          </div>
          <div class="history-card-body">
            <p style="margin-bottom:12px;color:var(--text-secondary);font-size:0.88rem;">${escapeHTML(entry.plan?.advice || '')}</p>
            <div style="font-size:0.84rem;color:var(--text-secondary);line-height:1.7">${planHTML}</div>
          </div>
        </div>`;
    }).join('');

    listEl.querySelectorAll('.history-card').forEach(c => c.remove());
    listEl.insertAdjacentHTML('beforeend', cards);
    lucide.createIcons();
  }

  function init() {
    listEl   = document.getElementById('history-list');
    emptyEl  = document.getElementById('history-empty');
    clearBtn = document.getElementById('clear-history-btn');

    // Remove old listeners
    const nList = listEl.cloneNode(true);
    const nClear = clearBtn.cloneNode(true);
    listEl.parentNode.replaceChild(nList, listEl);
    clearBtn.parentNode.replaceChild(nClear, clearBtn);
    listEl = nList;
    clearBtn = nClear;
    emptyEl  = document.getElementById('history-empty');

    render();

    // Toggle expand
    listEl.addEventListener('click', (e) => {
      const header = e.target.closest('.history-card-header');
      if (header) {
        header.closest('.history-card').classList.toggle('expanded');
      }
    });

    // Clear history
    clearBtn.addEventListener('click', () => {
      clearHistory();
      render();
      showToast('History cleared.', 'info');
    });
  }

  return { init, render };
})();
