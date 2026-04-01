/**
 * foodCatalog.js - Hardcoded campus food catalog organized by cafeteria.
 * Students select items from this catalog instead of typing prices manually.
 */

const FoodCatalog = (() => {
  const catalog = {
    'Captain Cook': [
      { name: 'Jollof Rice', price: 800, unit: 'per portion' },
      { name: 'Fried Rice', price: 800, unit: 'per portion' },
      { name: 'Basmati Jollof Rice', price: 1000, unit: 'per portion' },
      { name: 'Basmati Fried Rice', price: 1000, unit: 'per portion' },
      { name: 'White Rice', price: 800, unit: 'per portion' },
      { name: 'Jollof Spaghetti', price: 800, unit: 'per portion' },
      { name: 'White Spaghetti', price: 800, unit: 'per portion' },
      { name: 'Fried Spaghetti', price: 800, unit: 'per portion' },
      { name: 'Indomie', price: 1000, unit: 'per portion' },
      { name: 'Fried Fish', price: 600, unit: 'fixed price' },
      { name: 'Beef', price: 500, unit: 'fixed price' },
      { name: 'Fried Chicken', price: 900, unit: 'fixed price' },
      { name: 'Big Fried Chicken', price: 1500, unit: 'fixed price' },
      { name: 'Salad', price: 500, unit: 'per plate' },
      { name: 'Eggroll', price: 700, unit: 'fixed price' },
      { name: 'Meatpie', price: 1000, unit: 'fixed price' },
      { name: 'Doughnut', price: 500, unit: 'fixed price' },
      { name: 'Sausage Roll', price: 600, unit: 'fixed price' },
      { name: 'Short Cake', price: 1500, unit: 'fixed price' },
      { name: 'Big Short Cake', price: 2000, unit: 'fixed price' },
      { name: 'Moi Moi', price: 700, unit: 'per wrap' },
      { name: 'Fried Plantain', price: 500, unit: 'per portion' },
      { name: 'Ofada Rice', price: 800, unit: 'per portion' },
      { name: 'Ofada Sauce', price: 500, unit: 'per plate' },
      { name: 'Stew', price: 0, unit: 'free' },
      { name: 'Beans', price: 1000, unit: 'per portion' },
      { name: 'Boiled Yam', price: 200, unit: 'per portion' },
      { name: 'Egg Sauce', price: 450, unit: 'per portion' },
      { name: 'Fried Chips with Chicken', price: 4000, unit: 'fixed price' },
      { name: 'Fried Chips without Chicken', price: 3100, unit: 'fixed price' },
      { name: 'Ice Cream', price: 1500, unit: 'fixed price' },
      { name: 'Shawarma', price: 3000, unit: 'per wrap' },
    ],
  };

  function getCafeterias() {
    return Object.keys(catalog);
  }

  function getItemsByCafeteria(cafeteriaName) {
    return catalog[cafeteriaName] || [];
  }

  function getAllItems() {
    const all = [];
    for (const [caf, items] of Object.entries(catalog)) {
      items.forEach(item => {
        all.push({ ...item, cafeteria: caf });
      });
    }
    return all;
  }

  return { catalog, getCafeterias, getItemsByCafeteria, getAllItems };
})();
