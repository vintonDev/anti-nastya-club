# Anti-Nastya Club - Interactive Web

[**Live Demo**](ТВОЯ_ССЫЛКА_НА_VERCEL) | [**Video Breakdown**](https://www.youtube.com/watch?v=feMVw6S6xXU)

### 🚀 Overview
A custom-built e-commerce platform for Anti-Nastya Club, featuring a heavy focus on interactive visual storytelling and high-performance 2D canvas animation. Designed to deliver an immersive streetwear shopping experience with a custom frame-sequence rendering engine and a Node.js-powered backend.

### 🛠 Tech Stack
*   **Frontend:** JavaScript (ES6+), HTML5 Canvas API (Frame-Sequence Player), GSAP / CSS Animations
*   **Backend:** Node.js, Express, SQLite
*   **Performance & Assets:** Custom asset organization pipeline, responsive grid layouts
*   **UI/UX:** Custom crosshair cursor logic, dynamic cart state management via `localStorage`, fully responsive CRM/Admin dashboard

### 💡 Engineering Highlights
*   **Custom Sequence Rendering Engine:** Built a high-performance 2D canvas playback loop (`requestAnimationFrame`) optimized to handle multi-frame image sequences smoothly at 60 FPS without heavy WebGL overhead.
*   **Full-Stack Architecture:** Implemented a lightweight Node.js/Express backend paired with SQLite for seamless order management, product categorization, and status tracking (`new`, `sent`, `done`, `cancelled`).
*   **State & Cart Flow:** Engineered a robust client-side state management system for cart operations, variant selections (sizes/colors), and real-time total calculations.

### ⚙️ How to run locally
1. Clone the repo: `git clone <url>`
2. Install dependencies: `npm install`
3. Launch server: `node server.js`
4. Access the store at `http://localhost:3000`