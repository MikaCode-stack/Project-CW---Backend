🔥 MindForge Server — Backend API (Node.js + Express)
🌐 Overview

This repository contains the backend server powering the MindForge online learning platform.
It serves as the live API used by the GitHub Pages frontend:

👉 Frontend: [ https://mikacode-stack.github.io/MindForge-Frontend/](https://mikacode-stack.github.io/MindForge-Frontend/)

👉 Backend (current repo): [https://github.com/MikaCode-stack/MindForge-Backend](https://github.com/MikaCode-stack/MindForge-Backend)

👉 Live API on Render: [https://mindforge-api.onrender.com](https://project-cw-backend-apirest.onrender.com)

The backend exposes RESTful endpoints for:

lessons

order submission

stock/spaces validation

⚙️ Technologies Used

Node.js

Express.js

MongoDB / JSON / SQL (depending on your setup)

CORS enabled

Hosted on Render.com

Deployed as a live, always-on service

📦 What the Backend Does
✔ Serves all Lessons

Standardizes fields (subject, spaces, etc.)

Ensures consistent structure

Used by the frontend for course catalog

✔ Validates Cart Items

Rejects invalid or missing quantities

Prevents exceeding spaces

Ensures real-time data consistency

✔ Accepts Order Submissions

Receives a POST request from frontend

Validates the cart

Deducts spaces

Returns a success/failure response

✔ Maintains Live State

Acts as the “single source of truth” for available course spaces

Powers the GitHub Pages frontend with real data

🔌 API ROUTES
🔹 GET /lessons

Returns all lessons with standardized fields.

Response example:

{
        "_id": "6908eff4686aef7f1c43eeb8",
        "id": 1002,
        "subject": "English Literature",
        "description": "Shakespeare and more ",
        "price": 999.9,
        "image": "https://images.pexels.com/photos/189532/pexels-photo-189532.jpeg",
        "rating": 3,
        "category": "Languages",
        "spaces": 14,
        "location": "Online"
    },



Validations:

quantity > 0

quantity ≤ available spaces

invalid items rejected


🗄️ Database Structure

Each lesson follows:

{
  "id": 1014,
  "subject": "Web Design",
  "description": "Master HTML, CSS...",
  "price": 40,
  "image": "https://...",
  "rating": 4,
  "category": "Technology",
  "spaces": 15
}


🛠️ Local Development Setup
1. Clone the repo
git clone https://github.com/yourusername/mindforge-server
cd mindforge-server

2. Install dependencies
npm install

3. Environment variables (example .env)
PORT=3000
DB_URI=mongodb+srv://...

4. Run server
node server.js


or

npm start

🚀 Deployment (Render.com)

Create new Web Service

Connect GitHub repo

Set build command:

npm install


Set start command:

node server.js


Add environment variables

Deploy — the API becomes instantly available to the GitHub Pages frontend

🎯 Summary
Frontend

GitHub Pages → Fully client-side Vue.js application

Backend

Render.com → Live API handling lessons, carts, orders, validation

Together they form a complete, production-ready eLearning system.
