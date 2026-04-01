/**
 * food.js - Manages Food Item selection from the hardcoded catalog.
 * Students pick items from the catalog instead of typing prices manually.
 */

const Food = (() => {
  let foodListEl;
  let currentFoods = []; // Selected items cache

  function init() {
    foodListEl = document.getElementById('food-list');

    document.getElementById('add-food-btn').addEventListener('click', () => openCatalogModal());

    render();
  }

  // ── CATALOG MODAL ──
  function openCatalogModal() {
    const modalEl = document.getElementById('food-modal');
    
    // Get already selected food IDs
    const selectedIds = new Set(currentFoods.map(f => `${f.cafeteria}_${f.name}`));
    
    const cafeterias = FoodCatalog.getCafeterias();
    
    const modalContent = modalEl.querySelector('.modal');
    modalContent.innerHTML = `
      <div class="modal-header">
        <h3>Select Your Food Items</h3>
        <button class="icon-btn modal-close" id="modal-close"><i data-lucide="x"></i></button>
      </div>
      <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:16px;">
        Pick the items you normally eat. Prices are pre-filled from the campus menu.
      </p>
      <div style="max-height: 55vh; overflow-y:auto; padding-right:8px;">
        ${cafeterias.map(caf => {
          const items = FoodCatalog.getItemsByCafeteria(caf);
          return `
            <div style="margin-bottom:20px;">
              <h4 style="font-size:0.9rem; font-weight:700; color:var(--accent); margin-bottom:10px; padding-bottom:6px; border-bottom:1px solid var(--border);">
                <i data-lucide="store" style="width:16px; height:16px; margin-right:6px;"></i>${caf}
              </h4>
              <div style="display:grid; gap:6px;">
                ${items.map(item => {
                  const itemId = `${caf}_${item.name}`;
                  const isSelected = selectedIds.has(itemId);
                  return `
                    <label class="catalog-item ${isSelected ? 'catalog-item-selected' : ''}" style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:var(--bg-tertiary); border:1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}; border-radius:var(--radius-sm); cursor:pointer; transition: all 0.2s;">
                      <div style="display:flex; align-items:center; gap:10px;">
                        <input type="checkbox" class="catalog-checkbox" data-caf="${caf}" data-name="${item.name}" data-price="${item.price}" data-unit="${item.unit}" ${isSelected ? 'checked' : ''} style="accent-color:var(--accent); width:18px; height:18px;">
                        <div>
                          <div style="font-weight:600; font-size:0.88rem;">${item.name}</div>
                          <div style="font-size:0.72rem; color:var(--text-muted);">${item.unit}</div>
                        </div>
                      </div>
                      <div style="font-weight:700; font-size:0.9rem; color:${item.price === 0 ? 'var(--green)' : 'var(--accent)'};">
                        ${item.price === 0 ? 'Free' : '₦' + item.price.toLocaleString()}
                      </div>
                    </label>`;
                }).join('')}
              </div>
            </div>`;
        }).join('')}
      </div>
      <button id="catalog-save-btn" class="btn btn-primary btn-full" style="margin-top:16px;">
        <i data-lucide="check"></i> Save Selection
      </button>
    `;

    modalEl.classList.remove('hidden');
    lucide.createIcons();

    // Checkbox visual toggle
    modalEl.querySelectorAll('.catalog-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const label = e.target.closest('.catalog-item');
        if (e.target.checked) {
          label.classList.add('catalog-item-selected');
          label.style.borderColor = 'var(--accent)';
        } else {
          label.classList.remove('catalog-item-selected');
          label.style.borderColor = 'var(--border)';
        }
      });
    });

    // Close
    modalEl.querySelector('#modal-close').addEventListener('click', () => {
      modalEl.classList.add('hidden');
    });

    // Save
    modalEl.querySelector('#catalog-save-btn').addEventListener('click', () => {
      const selected = [];
      modalEl.querySelectorAll('.catalog-checkbox:checked').forEach(cb => {
        selected.push({
          _id: 'cat_' + cb.dataset.caf.replace(/\s/g, '') + '_' + cb.dataset.name.replace(/\s/g, ''),
          name: cb.dataset.name,
          price: parseFloat(cb.dataset.price) || 0,
          unit: cb.dataset.unit,
          cafeteria: cb.dataset.caf,
          type: 'fixed'
        });
      });

      currentFoods = selected;
      App.updateState({ foodItems: currentFoods });
      
      modalEl.classList.add('hidden');
      render();
      showToast(`${selected.length} food items saved`, 'success');
      if(window.AudioSystem) window.AudioSystem.playSound('chaching');
    });
  }

  // ── RENDER SELECTED ITEMS ──
  async function render() {
    try {
      const state = App.getState();
      currentFoods = state.foodItems || [];
      
      foodListEl.innerHTML = '';
      if (currentFoods.length === 0) {
        foodListEl.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 20px; color:var(--text-muted);">No items selected. Tap "Add Items" to pick from the campus menu.</div>`;
        return;
      }

      currentFoods.forEach(item => foodListEl.appendChild(renderCard(item)));
      lucide.createIcons();
    } catch(err) {
      console.error(err);
    }
  }

  function renderCard(item) {
    const card = document.createElement('div');
    card.className = 'card food-card';
    card.innerHTML = `
      <div class="food-info">
        <h4 style="display:flex; align-items:center; gap:6px;">${item.name}</h4>
        <div class="food-price" style="color:${item.price === 0 ? 'var(--green)' : 'var(--accent)'};">
          ${item.price === 0 ? 'Free' : '₦' + (item.price || 0).toLocaleString()}
        </div>
        <div style="display:flex; gap:6px; margin-top:8px; flex-wrap:wrap;">
          <span class="badge" style="font-size:0.7rem; background:var(--bg-tertiary);">${item.cafeteria || 'Campus'}</span>
          <span class="badge" style="font-size:0.7rem; background:var(--bg-tertiary);">${item.unit || ''}</span>
        </div>
      </div>
      <div class="food-actions">
        <button class="icon-btn delete-btn" aria-label="Remove"><i data-lucide="x"></i></button>
      </div>
    `;

    card.querySelector('.delete-btn').addEventListener('click', () => deleteFood(item._id));
    return card;
  }

  async function deleteFood(id) {
    currentFoods = currentFoods.filter(f => f._id !== id);
    App.updateState({ foodItems: currentFoods });
    showToast('Item removed', 'success');
    render();
  }

  return { init, render, getItems: () => currentFoods };
})();
