const fs = require('fs');
const path = require('path');

const file1 = path.join(__dirname, 'js/food.js');
let foodJs = fs.readFileSync(file1, 'utf8');

foodJs = foodJs.replace(/categoryInput\s*=\s*document\.getElementById\('food-category'\);/g, '');
foodJs = foodJs.replace(/let emoji = '🍲';[\s\S]*?if \(item\.category === 'unhealthy'\).*?;/g, '');
foodJs = foodJs.replace(/<span class="badge" style="font-size:0\.7rem;">\$\{emoji\} \$\{item\.category\}<\/span>/g, '');
foodJs = foodJs.replace(/categoryInput\.value = item\.category \|\| 'moderate';/g, '');
foodJs = foodJs.replace(/categoryInput\.value = 'moderate';/g, '');
foodJs = foodJs.replace(/const category = categoryInput\.value;/g, '');
foodJs = foodJs.replace(/const payload = \{ name, category, type, price, prices \};/g, 'const payload = { name, type, price, prices };');
foodJs = foodJs.replace(/categoryInput, /g, '');

fs.writeFileSync(file1, foodJs);

const file2 = path.join(__dirname, 'server/routes/ai.js');
let aiJs = fs.readFileSync(file2, 'utf8');

aiJs = aiJs.replace(
  /at \$\{minPriceObj\.cafeteria\} \[Health: \$\{f\.category\}\]/g, 
  'at ${minPriceObj.cafeteria}'
);
aiJs = aiJs.replace(
  /\} \[Health: \$\{f\.category \|\| 'moderate'\}\]/g, 
  '}'
);

aiJs = aiJs.replace(
  /2\. Balance healthy and moderate items\. Limit unhealthy\/"treat" items to 1-2 per week max based on their health tag\./g,
  `2. Balance healthy and moderate items. Limit unhealthy/"treat" items to 1-2 per week max. You MUST actively analyze each food's name to determine its health value.`
);

fs.writeFileSync(file2, aiJs);
console.log('Patched correctly');
