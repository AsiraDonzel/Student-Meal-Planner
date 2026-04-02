const express = require('express');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/ai/recommend
// @desc    Generate a 7-day meal plan based on user budget and food items
// @access  Private
router.post('/recommend', protect, async (req, res) => {
    try {
        // Fetch user data
        const { allowance, savingsGoal, budgetStartDate, budgetEndDate } = req.user;
        const { mode } = req.body || {};
        const spendingBudget = Math.max(0, allowance - savingsGoal);
        
        let days = 30;
        if (budgetStartDate && budgetEndDate) {
            const start = new Date(budgetStartDate);
            const end = new Date(budgetEndDate);
            days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
        }

        const dailyBudget = spendingBudget / days;
        const weeklyBudget = spendingBudget / (days / 7);

        // Get food items from client (stored locally in encrypted vault)
        const foodItems = req.body.foodItems || [];

        if (!foodItems || foodItems.length === 0) {
            return res.status(400).json({ success: false, error: 'You need to select some food items first! Go to Settings > Campus Food Menu.' });
        }

        const foodListStr = foodItems.map(f => {
            return `- ${f.name}: ₦${(f.price || 0).toLocaleString()} (${f.unit || 'fixed price'}) at ${f.cafeteria || 'Campus'}`;
        }).join('\n');

        // Get staple info from client payload
        const staples = req.body.staples || {};
        const hasGarri = staples.garri === 'Yes';
        const hasCereal = staples.cereal === 'Yes';
        const packPrice = req.body.packPrice || 200;

        let stapleStr = '';
        if (hasGarri || hasCereal) {
            const stapleList = [];
            if (hasGarri) stapleList.push('Soaked Garri (with sugar/groundnut) — ₦0 (already owned, eaten at home, NO pack fee)');
            if (hasCereal) stapleList.push('Cereal (cornflakes/oats with milk) — ₦0 (already owned, eaten at home, NO pack fee)');
            stapleStr = `\n\nSTAPLE ITEMS (Already Purchased — ₦0 cost, NO pack fee):\n${stapleList.join('\n')}\nYou MUST use these staple items in the plan, especially for breakfast or dinner. They cost ₦0 and do NOT need a pack. Prioritize them heavily when the budget is tight.`;
        }

        const systemPrompt = `You are SapaSaverAI, a budget-survival expert for Nigerian college students. Generate an optimal, budget-friendly weekly meal plan. All prices are in Nigerian Naira (₦).

PACK FEE RULE:
- Every meal bought from a cafeteria requires a pack/takeaway container that costs ₦${packPrice}.
- The pack fee MUST be added to the total cost of every cafeteria meal.
- Staple items eaten at home (Garri, Cereal) do NOT need a pack, so no pack fee for those.
- Example: If Jollof Rice costs ₦800, the real cost with pack is ₦${800 + packPrice}.

MEAL COMBINATION RULE:
- Meals should be REALISTIC COMBINATIONS of items, not just a single food alone.
- Nigerian students typically eat food combos like: "Jollof Rice + Fish", "Eba + Egusi Soup", "Fried Rice + Turkey + Plantain".
- The "item" field should describe the full combo (e.g. "2 Portions of Jollof Rice + Fish").
- QUANTITY RULE: For any food that is NOT a "fixed price" item (e.g. measured in Portions, Plates, or Wraps), NEVER recommend just 1 quantity unless the budget is extremely tight. Most students buy at least 2 portions/plates. (e.g., "2 Portions of Fried Rice" = N800 x 2 = N1600).
- The "cost" field should be the SUM of all items in the combo PLUS the pack fee (if cafeteria).
- The "breakdown" field must show the detailed math in text format, like: 2 Rice N1600 + Fish N600 + Pack N200
- It is okay to recommend a single item if that's all the budget allows, but prefer combos when possible.

RULES:
1. Total weekly cost MUST NOT exceed ₦${Math.round(weeklyBudget).toLocaleString()}.
${mode === 'surprise' ? '2. GENERATE A CREATIVE, RANDOM MEAL PLAN. Surprise with fun combos, but respect the budget.' : '2. Balance nutrition across the week. Analyze each food for its health value.'}
3. Vary meals across the week — do NOT repeat the same combo every day.
4. Every day MUST have exactly 3 slots: "breakfast", "lunch", "dinner".
5. If the budget cannot afford a meal for a slot, set the item to "Skip" with cost 0 and breakdown "Budget too tight".
6. Only use items from the provided menu (plus staple items below).
7. For "Portion" items, assume standard price per portion and multiply by the number of portions you assign.
8. Include the cafeteria name if available.${stapleStr}

CRITICAL INSTRUCTION: RESPOND ONLY WITH VALID JSON matching this exact structure. DO NOT OUTPUT MARKDOWN CODEBLOCKS. DO NOT OUTPUT ANY OTHER TEXT:
{
  "summary": {
    "total_weekly_cost": 0,
    "projected_monthly_cost": 0,
    "projected_savings": 0,
    "health_score_out_of_10": 0,
    "recommended_meals_per_day": 3,
    "meals_per_day_reason": "string"
  },
  "advice": "string",
  "weekly_plan": [
    {
      "day": "Monday",
      "breakfast": { "item": "string", "cost": 0, "breakdown": "string", "cafeteria": "string" },
      "lunch": { "item": "string", "cost": 0, "breakdown": "string", "cafeteria": "string" },
      "dinner": { "item": "string", "cost": 0, "breakdown": "string", "cafeteria": "string" },
      "daily_total": 0
    }
  ]
}`;

        const userPrompt = `My monthly allowance is ₦${allowance.toLocaleString()}.
My savings goal is ₦${savingsGoal.toLocaleString()}.
My spending budget is ₦${spendingBudget.toLocaleString()} for ${days} days.
Pack/Takeaway container fee: ₦${packPrice} per cafeteria meal.

Here are the available food items at my school:
${foodListStr}

Please generate a 7-day meal plan with breakfast, lunch, and dinner for each day. Combine items into realistic meal combos and include the pack fee in every cafeteria meal cost.`;

        const requestBody = {
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user',   content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 2048
        };

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error?.message || `API Error: ${response.status}`);
        }

        const data = await response.json();
        let content = data.choices[0].message.content.trim();
        
        // Strip markdown backticks if the model hallucinated them
        if (content.startsWith('```')) {
            content = content.replace(/^```(json)?\n?/i, '').replace(/\n?```$/i, '');
        }

        let parsedData = JSON.parse(content);
        
        // --- LLM Math Correction ---
        // LLMs are notoriously bad at basic arithmetic. We must recompute 
        // the total weekly cost to ensure the UI metrics perfectly match the generated meals.
        let actualTotal = 0;
        if (parsedData.weekly_plan && Array.isArray(parsedData.weekly_plan)) {
            parsedData.weekly_plan.forEach(day => {
                let dailyTotal = 0;
                ['breakfast', 'lunch', 'dinner'].forEach(meal => {
                    if (day[meal] && typeof day[meal].cost === 'number') {
                        dailyTotal += day[meal].cost;
                    }
                });
                day.daily_total = dailyTotal;
                actualTotal += dailyTotal;
            });
        }
        
        // Safely map it to the summary metric
        if (!parsedData.summary) parsedData.summary = {};
        parsedData.summary.total_weekly_cost = actualTotal;
        parsedData.summary.projected_monthly_cost = actualTotal * (30 / 7);
        parsedData.summary.projected_savings = spendingBudget - parsedData.summary.projected_monthly_cost;

        res.status(200).json({ success: true, data: parsedData });

    } catch (error) {
        console.error('AI Proxy Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
