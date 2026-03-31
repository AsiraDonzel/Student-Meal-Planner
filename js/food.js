/**
 * food.js – Manages the Food Item CRUD operations with the Backend API.
 * Supports Fixed-Price and Portion-Based foods.
 */

const Food = (() => {
  let foodListEl, modalEl, formEl;
  let nameInput, priceInput, typeRadios, fixedGroup, portionGroup, cafRowsEl, addCafBtn;
  let isEditing = false;
  let currentFoods = []; // Cache

  function init() {
    foodListEl = document.getElementById('food-list');
    modalEl    = document.getElementById('food-modal');
    formEl     = document.getElementById('food-form');
    
    nameInput     = document.getElementById('food-name');
    priceInput    = document.getElementById('food-price');
    typeRadios    = document.querySelectorAll('input[name="food-type"]');
    fixedGroup    = document.getElementById('fixed-price-group');
    portionGroup  = document.getElementById('portion-price-group');
    cafRowsEl     = document.getElementById('cafeteria-rows');
    addCafBtn     = document.getElementById('add-cafeteria-btn');

    document.getElementById('add-food-btn').addEventListener('click', () => openModal());
    document.getElementById('modal-close').addEventListener('click', closeModal);
    formEl.addEventListener('submit', saveFood);

    // Dynamic Form Handlers
    typeRadios.forEach(radio => radio.addEventListener('change', toggleTypeFields));
    addCafBtn.addEventListener('click', () => cafRowsEl.appendChild(createCafeteriaRow()));

    render();
  }

  function toggleTypeFields() {
    const isFixed = document.querySelector('input[name="food-type"]:checked').value === 'fixed';
    if (isFixed) {
      fixedGroup.classList.remove('hidden');
      priceInput.setAttribute('required', 'true');
      portionGroup.classList.add('hidden');
      document.querySelectorAll('.caf-name-input, .caf-price-input').forEach(el => el.removeAttribute('required'));
    } else {
      fixedGroup.classList.add('hidden');
      priceInput.removeAttribute('required');
      portionGroup.classList.remove('hidden');
      document.querySelectorAll('.caf-name-input, .caf-price-input').forEach(el => el.setAttribute('required', 'true'));
      
      if (cafRowsEl.children.length === 0) {
        cafRowsEl.appendChild(createCafeteriaRow('Main Cafeteria', ''));
      }
    }
  }

  function createCafeteriaRow(cafName = '', cafPrice = '') {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '8px';
    
    const cafeterias = ['Captain Cook', 'CAF 1', 'CAF 2', 'Smoothie Shack', 'Med Cafe'];
    const options = cafeterias.map(c => 
      `<option value="${c}" ${c === cafName ? 'selected' : ''}>${c}</option>`
    ).join('');
    
    row.innerHTML = `
      <select class="caf-name-input" style="flex:1;" required>
        <option value="" disabled ${!cafName ? 'selected' : ''}>Select Cafeteria</option>
        ${options}
      </select>
      <input type="number" class="caf-price-input" placeholder="Price (₦)" value="${cafPrice}" style="width:100px;" required min="0">
      <button type="button" class="btn btn-ghost btn-sm remove-caf-btn" style="padding:0 8px; color:var(--red);" aria-label="Remove">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
      </button>
    `;
    row.querySelector('.remove-caf-btn').addEventListener('click', () => {
      row.remove();
      if (cafRowsEl.children.length === 0) cafRowsEl.appendChild(createCafeteriaRow());
    });
    return row;
  }

  async function render() {
    try {
      const state = App.getState();
      currentFoods = state.foodItems || [];
      
      foodListEl.innerHTML = '';
      if (currentFoods.length === 0) {
        foodListEl.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 20px; color:var(--text-muted);">No items yet. Add your campus food!</div>`;
        return;
      }

      currentFoods.forEach(item => foodListEl.appendChild(renderCard(item)));
      lucide.createIcons();
    } catch(err) {
      console.error(err);
    }
  }

  function renderCard(item) {
    const isPortion = item.type === 'portion' && item.prices && item.prices.length > 0;
    
    let priceDisplay = `₦0`;
    let subDisplay = '';
    
    if (isPortion) {
      const minPriceObj = item.prices.reduce((min, p) => p.price < min.price ? p : min, item.prices[0]);
      priceDisplay = `From ₦${minPriceObj.price.toLocaleString()}`;
      subDisplay = `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">at ${minPriceObj.cafeteria}</div>`;
    } else {
      priceDisplay = `₦${(item.price || 0).toLocaleString()}`;
    }

    

    const card = document.createElement('div');
    card.className = 'card food-card';
    card.innerHTML = `
      <div class="food-info">
        <h4 style="display:flex; align-items:center; gap:6px;">${item.name}</h4>
        <div class="food-price">${priceDisplay}</div>
        ${subDisplay}
        <div style="display:flex; gap:6px; margin-top:8px; flex-wrap:wrap;">
          
          ${isPortion ? `<span class="badge" style="font-size:0.7rem; background:var(--bg-secondary);">Portion</span>` : ''}
        </div>
      </div>
      <div class="food-actions">
        <button class="icon-btn edit-btn" aria-label="Edit"><i data-lucide="edit-2"></i></button>
        <button class="icon-btn delete-btn" aria-label="Delete"><i data-lucide="trash-2"></i></button>
      </div>
    `;

    card.querySelector('.edit-btn').addEventListener('click', () => openModal(item));
    card.querySelector('.delete-btn').addEventListener('click', () => deleteFood(item._id));
    return card;
  }

  function openModal(item = null) {
    isEditing = !!item;
    document.getElementById('modal-title').textContent = isEditing ? 'Edit Item' : 'Add Item';
    document.getElementById('modal-submit-text').textContent = isEditing ? 'Save Changes' : 'Add Item';
    document.getElementById('food-edit-id').value = item ? item._id : '';

    cafRowsEl.innerHTML = '';

    if (item) {
      nameInput.value = item.name;
      
      document.querySelector(`input[name="food-type"][value="${item.type || 'fixed'}"]`).checked = true;
      priceInput.value = item.price || '';
      
      if (item.type === 'portion' && item.prices) {
         item.prices.forEach(p => cafRowsEl.appendChild(createCafeteriaRow(p.cafeteria, p.price)));
      }
    } else {
      formEl.reset();
      
      document.querySelector('input[name="food-type"][value="fixed"]').checked = true;
    }

    toggleTypeFields();
    modalEl.classList.remove('hidden');
  }

  function closeModal() {
    modalEl.classList.add('hidden');
    formEl.reset();
    cafRowsEl.innerHTML = '';
  }

  async function saveFood(e) {
    e.preventDefault();
    const id = document.getElementById('food-edit-id').value;
    const name = nameInput.value.trim();
    const type = document.querySelector('input[name="food-type"]:checked').value;
    
    let price = 0;
    let prices = [];

    if (type === 'fixed') {
      price = parseFloat(priceInput.value) || 0;
    } else {
      const rows = cafRowsEl.querySelectorAll('div');
      rows.forEach(row => {
        const cName = row.querySelector('.caf-name-input').value.trim();
        const cPrice = parseFloat(row.querySelector('.caf-price-input').value) || 0;
        if (cName && cPrice > 0) {
          prices.push({ cafeteria: cName, price: cPrice });
        }
      });
      if (prices.length === 0) {
        showToast('Please add at least one cafeteria price', 'error');
        return;
      }
    }

    const payload = { name, type, price, prices };

    try {
      if (isEditing) {
        const index = currentFoods.findIndex(f => f._id === id);
        if (index > -1) {
          currentFoods[index] = { ...currentFoods[index], ...payload };
          App.updateState({ foodItems: currentFoods });
          showToast('Item updated in secure vault', 'success');
        }
      } else {
        const newItem = { ...payload, _id: 'local_' + Date.now() };
        currentFoods.push(newItem);
        App.updateState({ foodItems: currentFoods });
        showToast('Item added to secure vault', 'success');
      }
      closeModal();
      render();
    } catch(err) {
      showToast(err.message, 'error');
    }
  }

  async function deleteFood(id) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      currentFoods = currentFoods.filter(f => f._id !== id);
      App.updateState({ foodItems: currentFoods });
      showToast('Item deleted from vault', 'success');
      render();
    } catch(err) {
      showToast('Failed to delete item', 'error');
    }
  }

  return { init, render, getItems: () => currentFoods };
})();
