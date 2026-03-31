const express = require('express');
const { protect } = require('../middleware/auth');
const FoodItem = require('../models/FoodItem');

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

        // Fetch user's foods
        const foodItems = await FoodItem.find({ userId: req.user.id });

        if (!foodItems || foodItems.length === 0) {
            return res.status(400).json({ success: false, error: 'You need to add some food items first!' });
        }

        const foodListStr = foodItems.map(f => {
            if (f.type === 'portion' && f.prices && f.prices.length > 0) {
                // Find minimum price
                const minPriceObj = f.prices.reduce((min, p) => p.price < min.price ? p : min, f.prices[0]);
                return `- ${f.name} (Portion): ₦${minPriceObj.price.toLocaleString()} at ${minPriceObj.cafeteria}`;
            } else {
                return `- ${f.name} (Fixed): ₦${f.price ? f.price.toLocaleString() : 0}`;
            }
        }).join('\n');

        // Get staple info from client payload
        const staples = req.body.staples || {};
        const hasGarri = staples.garri === 'Yes';
        const hasCereal = staples.cereal === 'Yes';

        let stapleStr = '';
        if (hasGarri || hasCereal) {
            const stapleList = [];
            if (hasGarri) stapleList.push('Soaked Garri (with sugar/groundnut) — ₦0 (already owned)');
            if (hasCereal) stapleList.push('Cereal (cornflakes/oats with milk) — ₦0 (already owned)');
            stapleStr = `\n\nSTAPLE ITEMS (Already Purchased — ₦0 cost):\n${stapleList.join('\n')}\nYou MUST use these staple items in the plan, especially for breakfast or dinner. Treat them as ₦0 cost. Prioritize them heavily when the budget is tight to maximize savings.`;
        }

        const systemPrompt = `You are SapaSaverAI, a budget-survival expert for Nigerian college students. Generate an optimal, budget-friendly weekly meal plan. All prices are in Nigerian Naira (₦).

RULES:
1. Total weekly cost MUST NOT exceed ₦${Math.round(weeklyBudget).toLocaleString()}.
${mode === 'surprise' ? '2. GENERATE A CREATIVE, RANDOM MEAL PLAN. Surprise the user with fun combinations, but strictly respect the budget.' : '2. Balance nutrition across the week. Analyze each food name for its health value.'}
3. Vary meals across the week — do NOT repeat the same combination every day.
4. Every day MUST have exactly 3 slots: "breakfast", "lunch", "dinner".
5. If the budget cannot afford a meal for a slot, set the item to "Skip" with cost 0. This tells the student they should skip that meal to save money.
6. Only use items from the provided menu (plus any staple items listed below).
7. For "Portion" items, use the cheapest cafeteria price shown.
8. Include the cafeteria name if available for that item.${stapleStr}

RESPOND ONLY with valid JSON matching this exact schema (no markdown, no explanation):
{
  "summary": {
    "total_weekly_cost": 0,
    "projected_monthly_cost": 0,
    "projected_savings": 0,
    "health_score_out_of_10": 0,
    "recommended_meals_per_day": 3,
    "meals_per_day_reason": "Short explanation based on budget."
  },
  "advice": "A short, encouraging 2-sentence summary.",
  "weekly_plan": [
    {
      "day": "Monday",
      "breakfast": { "item": "Name or Skip", "cost": 0, "cafeteria": "" },
      "lunch": { "item": "Name or Skip", "cost": 0, "cafeteria": "" },
      "dinner": { "item": "Name or Skip", "cost": 0, "cafeteria": "" },
      "daily_total": 0
    }
  ]
}`;

        const userPrompt = `My monthly allowance is ₦${allowance.toLocaleString()}.
My savings goal is ₦${savingsGoal.toLocaleString()}.
My spending budget is ₦${spendingBudget.toLocaleString()} for ${days} days.

Here are the available food items at my school:
${foodListStr}

Please generate a 7-day meal plan with breakfast, lunch, and dinner for each day.`;

        const requestBody = {
            model: 'openai/gpt-oss-120b',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user',   content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 2048,
            response_format: { type: "json_object" },
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
        const content = data.choices[0].message.content;

        res.status(200).json({ success: true, data: JSON.parse(content) });

    } catch (error) {
        console.error('AI Proxy Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
