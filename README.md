🏥 Clinic Management System (MERN)

A full-stack **Clinic & Patient Management Web Application** built using the **MERN stack**, designed for doctors and small clinics to manage patients, appointments, billing, and reports efficiently.

This project goes beyond a basic CRUD app and focuses on **real-world clinic workflows**, including OTP-based authentication, secure password recovery, role-based access, and Excel-friendly reporting.

---

✨ Features

-   👨‍⚕️ Doctor signup & login
-   📱 OTP-based phone verification (2Factor)
-   🔐 Forgot password with OTP reset flow
-   📋 Patient records management
-   📅 Appointment scheduling
-   💳 Billing & invoice generation
-   📊 Excel / CSV export for reports
-   🔍 Filters (date, service, payment mode, etc.)
-   📱 Fully responsive UI
-   ☁️ Cloud-hosted backend & database

---

🛠 Tech Stack

### Frontend

-   React.js (Create React App)
-   Bootstrap 5
-   React Router DOM
-   Fetch API

### Backend

-   Node.js
-   Express.js
-   MongoDB Atlas
-   JWT Authentication
-   OTP Service (2Factor)
-   bcrypt (password hashing)

### Deployment

-   Frontend: **Vercel**
-   Backend: **Render**
-   Database: **MongoDB Atlas**

---

📦 Required npm Packages

### Frontend Dependencies
```bash
npm install react react-dom react-router-dom bootstrap axios
```
### Backend Dependencies
```bash
npm install express mongoose cors dotenv jsonwebtoken bcryptjs axios
```

### Dev Dependency
```bash
npm install nodemon --save-dev
```

### Backend (/backend/.env)
```bash
PORT=5001
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret
OTP_API_KEY=your_2factor_api_key
```

### Frontend (/frontend/.env)
```bash
REACT_APP_API_URL=http://localhost:5001
```

🗄 MongoDB Atlas Setup
```bash
Go to https://www.mongodb.com/atlas

Create a free cluster

Create a database user

Whitelist IP (0.0.0.0/0 for development)

Copy the connection string

Paste it into MONGO_URI in .env
```
Running the Project Locally

1️⃣ Clone the Repository
```bash
git clone https://github.com/codingbent/InvoHealth.git
cd clinic-management-system
```
2️⃣ Start Backend
```bash
cd backend
npm install
nodemon index.js
```

Backend runs at:
```bash
http://localhost:5001
```
3️⃣ Start Frontend
```bash
cd frontend
npm install
npm start
```

Frontend runs at:
```bash
http://localhost:3000
```

☁️ Deployment Guide
Backend (Render)

Create a new Web Service

Connect your GitHub repository

Build command:
```bash
npm install
```

Start command:
```bash
node index.js
```

Add environment variables in Render dashboard

Frontend (Vercel)

Import the GitHub repository

Select the frontend folder

Add environment variable:
```bash
REACT_APP_API_URL=https://your-render-backend-url
```
Deploy


🔐 Authentication Flow

Signup → Phone OTP verification

Login → Email + password

Forgot password → OTP → Reset password

JWT-based protected routes

📈 Future Enhancements

Offline-first support (IndexedDB)

Analytics dashboard

Progressive Web App (PWA)

Dark mode

👨‍💻 Author

Abhed Agarwal
Full Stack Developer (MERN)
📧 Email: abhed.agl@gmail.com
