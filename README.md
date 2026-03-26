# 🍽️ Student Meal Planner

**AI-powered meal planning for students on a budget.** Built with vanilla HTML/CSS/JS and powered by Groq AI.

![Student Meal Planner](https://img.shields.io/badge/AI-Powered-6c5ce7?style=for-the-badge)
![Vanilla JS](https://img.shields.io/badge/Vanilla-JavaScript-f7df1e?style=for-the-badge)

---

## ✨ Features

- **Smart Budget Dashboard** – Set your monthly allowance and savings goal, see real-time remaining budget
- **Campus Food Menu** – Pre-loaded with common items; add, edit, or remove items (persisted in localStorage)
- **AI Meal Planning** – Groq AI generates a full 7-day meal plan optimized for health and budget
- **Budget Visualization** – Doughnut chart showing spending by meal type
- **Recommendation History** – All past plans saved and viewable
- **Dark / Light Mode** – Auto-detects OS preference, toggleable
- **Fully Responsive** – Works on mobile, tablet, and desktop

---

## 🚀 Quick Start (Local Dev)

### 1. Clone & serve

```bash
# No build step needed – it's vanilla HTML/CSS/JS
npx -y serve .
```

### 2. Add your Groq API Key

1. Open the app in your browser (usually `http://localhost:3000`)
2. Click the **⚙️ Settings** gear icon in the header
3. Paste your [Groq API key](https://console.groq.com/keys) into the **Groq API Key** field
4. Click **Save Settings**

### 3. Use the app

1. Set your **Monthly Allowance** and **Savings Goal**
2. Review (and optionally edit) the **Campus Food Menu**
3. Click **🧠 Get AI Recommendation**
4. View your personalized weekly meal plan!

---

## 🌐 Production Deployment (Vercel)

For production, you should **never expose your API key in the browser**. Use the included serverless proxy instead:

### 1. Deploy to Vercel

```bash
npx -y vercel
```

### 2. Set your environment variable

```bash
vercel env add GROQ_API_KEY
```

### 3. Configure the proxy in the app

1. Open Settings in the app
2. Set **Proxy URL** to: `https://your-app.vercel.app/api/recommend`
3. Leave the **API Key** field empty (the proxy handles it)

The `api/recommend.js` file is automatically detected by Vercel as a serverless function.

---

## 📁 Project Structure

```
├── index.html          Main app shell
├── css/style.css       Design system (light/dark, responsive)
├── js/
│   ├── app.js          App initializer
│   ├── store.js        localStorage CRUD
│   ├── theme.js        Dark/light toggle
│   ├── budget.js       Budget computation
│   ├── food.js         Food list CRUD UI
│   ├── ai.js           Groq API integration
│   ├── chartModule.js  Chart.js visualization
│   └── history.js      Past recommendations
├── api/
│   └── recommend.js    Serverless proxy (Vercel/Netlify)
├── .env.example        API key template
└── README.md           This file
```

---

## 🔑 API

Uses [Groq API](https://console.groq.com/) with model `llama3-70b-8192`.

The AI is prompted to return structured JSON containing:
- A 7-day meal plan (breakfast, lunch, dinner, snacks)
- Total costs and projected savings
- A health score and nutritional advice

---

## 📄 License

MIT
