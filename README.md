🔁 Subscription Management System

One platform to run plans, subscriptions, invoices, payments and revenue reports.


📖 About

Brightloop Software sells everything on subscription, but runs it on spreadsheets: renewals get missed, invoices are typed by hand and nobody knows the real recurring revenue. This project replaces all of that with one system, from setting up products to reporting revenue.

   <table> <thead> <tr> <th width="50%" align="left">❌ Before (manual)</th> <th width="50%" align="left">✅ After (this project)</th> </tr> </thead> <tbody> <tr> <td>Subscriptions in a spreadsheet</td> <td>Subscriptions with tracked status</td> </tr> <tr> <td>Renewals remembered by people</td> <td>Pause, resume, close and renew workflows</td> </tr> <tr> <td>Invoices typed by hand</td> <td>Invoices generated from subscriptions</td> </tr> <tr> <td>Payments matched from bank statements</td> <td>Payments recorded against invoices</td> </tr> <tr> <td>Quarterly manual reports</td> <td>Live finance dashboard</td> </tr> </tbody> </table>



✨ Features
<table> <thead> <tr> <th align="left" width="30%">Feature</th> <th align="left" width="70%">What it does</th> </tr> </thead> <tbody> <tr> <td>🔐 <b>Authentication</b></td> <td>Register, email verification, resend link, login, logout and Google sign-in</td> </tr> <tr> <td>📧 <b>Email (Nodemailer)</b></td> <td>Verification emails sent automatically on sign-up</td> </tr> <tr> <td>🎬 <b>Smooth UI (Motion)</b></td> <td>Animated page transitions, modals, cards and list items</td> </tr> <tr> <td>👥 <b>Role-based access</b></td> <td>Admin, Staff and Customer each get their own menu and permissions</td> </tr> <tr> <td>📦 <b>Products and variants</b></td> <td>Sales price, cost price, notes, and variants that add to the price (Brand: Odoo adds 560)</td> </tr> <tr> <td>🗓️ <b>Plans</b></td> <td>Daily, weekly, monthly or yearly billing, minimum quantity, availability dates</td> </tr> <tr> <td>📝 <b>Quotations and subscriptions</b></td> <td>Draft, Quotation, Confirmed, Active, Closed, plus pause and resume</td> </tr> <tr> <td>🧾 <b>Invoicing</b></td> <td>Generated from subscriptions with automatic tax; confirm, send and cancel</td> </tr> <tr> <td>🏷️ <b>Discounts</b></td> <td>Fixed or percentage, with conditions, dates and usage limits (admin only)</td> </tr> <tr> <td>💳 <b>Payments</b></td> <td>Recorded per invoice with method, amount, date and note</td> </tr> <tr> <td>📊 <b>Finance dashboard</b></td> <td>Active subscriptions, revenue, amount owed and overdue invoices</td> </tr> <tr> <td>🙋 <b>Customer portal</b></td> <td>Customers see only their own subscriptions and invoices</td> </tr> </tbody> </table>


🛠️ Tech Stack
Layer	Technology
Frontend	React (Vite), React Router, Axios, Tailwind CSS, Motion
Backend	Node.js, Express (ES modules)
Database	MongoDB with Mongoose
Auth	JWT, Passport (Google OAuth)
Email	Nodemailer

🔄 How It Works

Subscription lifecycle

- Draft
- Quotation
- Confirmed
- Active
- Closed
- Paused

Invoice lifecycle

- Draft
- Confirmed
- Sent
- Paid
- Cancelled

Sign-up and email verification

- Nodemailer
- Express API
- React App
- User
- Nodemailer
- Express API
React App

- User
- Fill register form
- POST /api/auth/register
- Send verification email
- Email with link
- Open /verify-email/:token
- GET /api/auth/verify-email/:token
- Email verified
-  Login

🚀 Quick Start

1. Clone the repository
bash
git clone https://github.com/abhaypal0/subscription_management_system
cd subscription_management_system
2. Backend setup
bash
cd Backend
npm install

Create Backend/.env:

env
PORT=8080
MONGO_URI=<your-mongodb-connection-string>
JWT_SECRET=<your-secret>
FRONTEND_URL=http://localhost:5173

# Nodemailer (SMTP)
EMAIL_USER=<your-email-address>
EMAIL_PASS=<app-password>

# Google OAuth 
GOOGLE_CLIENT_ID=<id>
GOOGLE_CLIENT_SECRET=<secret>

💡 With Gmail, use an App Password (Google Account > Security > 2-Step Verification > App passwords), not your normal password.

Run it:

bash
npm run dev
3. Frontend setup
bash
cd Frontend
npm install

Create Frontend/.env:

env
VITE_API_URL=http://localhost:8080/api

Run it:

bash
npm run dev

Open http://localhost:5173.

4. Try the three roles
Role	What they see
admin	Everything, including products, plans, discounts, taxes and staff
staff	Subscriptions, quotations, invoices and payments
customer	Only their own subscriptions, quotations and invoices

🎬 Animations (Motion)

The frontend uses Motion (motion/react) for:

- page and route transitions
- modals and slide-in panels
- staggered list and table rows
- hover and tap feedback on cards and buttons jsx
import { motion } from "motion/react";

<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  ...
</motion.div>
📧 Email (Nodemailer)

Nodemailer sends the account verification email when a user registers. Users who did not get it can request another link from the resend-verification endpoint.

js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

The link in the email opens FRONTEND_URL/verify-email/.

🔌 API Overview
Area	Base path	Notes
Auth	/api/auth	register, verify-email, resend-verification, login, me, logout
Google auth	/api/auth/google	OAuth login and callback
Products	/api/products	admin writes; staff and customers read
Variants	/api/variants	admin writes
Plans	/api/plans	create, list, update, delete
Quotations	/api/quotations	create, list, update, status changes
Subscriptions	/api/subscriptions	create, activate, pause, resume, close
Invoices	/api/invoices	generate, list, confirm, send, cancel

Roles are lowercase: admin, staff, customer.


🔒 Permissions
- Capability	                               Admin	Staff	Customer
- Manage products, plans, taxes, discounts   	✅	    ❌	   ❌
- Add staff members	                            ✅	    ❌	   ❌
- Create quotations and subscriptions	        ✅	    ✅	   ❌
- Generate and manage invoices	                ✅	    ✅	   ❌
- Record payments	                            ✅	    ✅	   ❌
- View own subscriptions and invoices	        ✅	    ✅	   ✅

📁 Project Structure
subscription_management_system/
├── Backend/
│   ├── express.js            # entry point
│   └── src/
│       ├── config/           # db, passport
│       ├── controller(s)/
│       ├── middlewares/      # auth, role checks
│       ├── models/
│       ├── routes/
│       ├── services/         # mail, billing
│       └── validator/
└── Frontend/
    └── src/
        ├── api/              # axios instance
        ├── components/       # layout and shared UI
        ├── context/          # AuthContext
        ├── pages/            # auth, dashboard, features
        └── routes/           # ProtectedRoute

🗺️ Roadmap
- Authentication with email verification (Nodemailer)
- Role-based layout and protected routes
- Animated UI with Motion
- Products and variants pages
- Plans, quotations and subscriptions pages
- Invoices and payments pages
- Discounts and taxes
- Finance dashboard with filters
- Forgot and reset password

⚡ Performance

Lists use server-side database indexes on status, due date and customer, so pages stay under two seconds with thousands of subscriptions.

🤝 Contributing
Fork the repo
Create a branch: git checkout -b feature/my-feature
Commit: git commit -m "Add my feature"
Push and open a pull request
📄 License

For educational use.



Built with ❤️ by Team ShadowCoders: Abhay Pal, Jaiganesh, Asmit Mishra and Mayank Mishra.

