# 🥣 SapaSaver 

**Beat Sapa. Eat Better.** AI-powered meal planning for students surviving on a budget. 

![SapaSaver](https://img.shields.io/badge/Status-Vercel%20Live-6c5ce7?style=for-the-badge)
![Encryption](https://img.shields.io/badge/Security-AES--GCM-00b894?style=for-the-badge)

---

## ✨ Features

- **🛡️ Encrypted Vault** – All your budget data is secured with a Master Password using AES-GCM encryption.
- **🥣 Staple Sustainability** – Tell SapaSaver if you have Garri or Cereal at home; the AI will optimize your meals for ₦0 cost. 
- **🧠 AI Meal Planning** – Powered by Groq AI (`gpt-oss-120b`) for ultra-low-budget meal recommendations.
- **📉 Budget Snapshots** – Real-time tracking of your remaining allowance and daily targets.
- **🌙 Multiple Themes** – Choose between Darkness, Forest, and Sunset views.

---

## 🚀 Deployment (Vercel)

SapaSaver is built to be deployed on Vercel with a single click.

1. **Connect Repository** to Vercel.
2. **Add Environment Variables**:
   - `MONGO_URI`: Your MongoDB connection string.
   - `GROQ_API_KEY`: Your Groq API key.
   - `JWT_SECRET`: A random string for securing login tokens.
3. **Deploy** 🚀

---

## 📁 Project Structure

```
├── assets/             Images & Favicons
├── api/                Vercel Serverless Functions
├── server/             Express.js Logic & Models
├── js/                 Frontend Modules (Vanilla JS)
├── css/                Design System (Vanilla CSS)
├── vercel.json         Deployment Configuration
└── index.html          Main Dashboard
```

---

## 🔑 Technologies
- **Frontend**: Vanilla HTML/CSS/JS (Lucide Icons, Chart.js)
- **Backend**: Node.js, Express, MongoDB Mongoose
- **AI**: Groq API
- **Security**: Web Crypto API (PBKDF2 + AES-GCM)

---

## 📄 License
MIT
