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

        const systemPrompt = `You are StudentWalletAI, an expert financial advisor and nutritionist for Nigerian college students. Generate an optimal, budget-friendly, healthy weekly meal plan. All prices are in Nigerian Naira (₦).

RULES:
1. Total weekly cost must NOT exceed ₦${Math.round(weeklyBudget).toLocaleString()} (weekly budget).
${mode === 'surprise' ? '2. GENERATE A CREATIVE, RANDOM MEAL PLAN that the user might not normally choose. Surprise the user with a fun twist, but strictly stick to the budget.' : `2. Balance healthy and moderate items. Limit unhealthy/"treat" items to 1-2 per week max. You MUST actively analyze each food's name to determine its health value.`}
3. Vary meals across the week — do NOT repeat the same combination every day.
4. Based on the budget, recommend how many meals per day the student should eat (1, 2, or 3). If the budget is very tight, recommend 1-2 meals instead of 3. If comfortable, recommend 3 meals plus a snack.
5. You must determine the best meal type (breakfast, lunch, dinner, snack) for each food based on its name.
6. Only use items from the provided menu. For "Portion" items, you can assume the student can buy it at the listed cafeteria for the lowest price shown.
7. Include the cafeteria name in your output if it was provided for that item.
8. All costs must be in Nigerian Naira (₦).
9. For each day, ONLY include the meals you recommend (no empty slots).

RESPOND ONLY with valid JSON matching this exact schema (no markdown, no explanation):
{
  "summary": {
    "total_weekly_cost": 0,
    "projected_monthly_cost": 0,
    "projected_savings": 0,
    "health_score_out_of_10": 0,
    "recommended_meals_per_day": 3,
    "meals_per_day_reason": "Short explanation of why this number of meals was chosen based on budget."
  },
  "advice": "A short, encouraging 2-sentence summary.",
  "weekly_plan": [
    {
      "day": "Monday",
      "breakfast": { "item": "Name", "cost": 0, "cafeteria": "Name of cafeteria (or empty string)" },
      "lunch": { "item": "Name", "cost": 0, "cafeteria": "" },
      "dinner": { "item": "Name", "cost": 0, "cafeteria": "" },
      "snack": { "item": "Name", "cost": 0, "cafeteria": "" },
      "daily_total": 0
    }
  ]
}`;

        const userPrompt = `My monthly allowance is ₦${allowance.toLocaleString()}.
My savings goal is ₦${savingsGoal.toLocaleString()}.
My spending budget is ₦${spendingBudget.toLocaleString()} for ${days} days.

Here are the available food items at my school:
${foodListStr}

Please generate a 7-day meal plan.`;

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
