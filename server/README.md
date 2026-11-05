# RideMate 🚗

**A MERN Stack-based shared ride coordination platform that helps people find and coordinate rides from railway stations and airports to colleges and nearby destinations.**

RideMate makes it easier for travelers heading towards similar destinations to connect and share available seats in a ride. Users can create rides, explore available rides, send join requests, and manage their ride participation through a simple platform.

## 🌟 Features

### 🔐 Authentication & User Management

- User registration and login.
- JWT-based authentication using HTTP-only cookies.
- Protected routes for authenticated users.
- User profile management with profile image upload.

### 🚘 Ride Management

- Create rides with departure location, destination, date, time, and available seats.
- Edit or delete rides based on ride conditions.
- View and manage rides created by you.
- Automatically manage ride statuses based on departure time.
- Search for available rides based on travel details.

### 🤝 Join Requests

- Send requests to join available rides.
- Upload ticket proof while requesting to join.
- Ride owners can approve or reject requests.
- Available seats are updated when a request is approved.
- Cancel an approved request and release the reserved seat.
- Notifications for important ride and request updates.

### ⭐ Review & Rating System

- Participants can review other participants after ride completion.
- Users can submit ratings and comments.
- Blind review mechanism to encourage honest feedback.
- Reviews become visible when both participants submit their reviews or the review period expires.

### ⏰ Automated Ride Status Management

- Automatically close rides near departure time.
- Mark rides as completed after the scheduled departure time.
- Update associated approved join requests when a ride is completed.
- Prevent participation in expired or unavailable rides.

## 🛠️ Tech Stack

| Technology | Purpose                 |
| ---------- | ----------------------- |
| React.js   | Frontend development    |
| Node.js    | Backend runtime         |
| Express.js | REST API development    |
| MongoDB    | Database                |
| Mongoose   | MongoDB object modeling |
| JWT        | Authentication          |
| Axios      | API communication       |
| Cloudinary | Profile image storage   |
| CSS        | Frontend styling        |

## 📁 Project Structure


RideMate/
│
├── client/                 # React frontend
│   ├── public/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── context/
│       ├── services/
│       └── ...
│
├── server/                 # Express backend
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── job/
│   ├── utils/
│   └── ...
│
├── .gitignore
└── README.md


*The structure above represents the main organization; individual folders may vary depending on the current implementation.*

## ⚙️ Installation & Setup

### 1. Clone the Repository

bash
git clone https://github.com/codersSaurabh/RideMate
cd RideMate


### 2. Set Up the Backend

bash
cd server
npm install


Create a `.env` file inside the `server` directory and configure the required environment variables:


PORT
MONGO_URI
JWT_SECRET=
JWT_EXPIRES_IN
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET

Use the exact environment variable names expected by your backend configuration.

Start the backend:

bash
npm start


### 3. Set Up the Frontend

Open another terminal:

bash
cd client
npm install
npm run dev


The React development server will start. Open the local URL displayed in your terminal.

## 🔒 Security & Validation

- Protected backend routes using JWT authentication.
- Authorization checks for ride ownership and request management.
- Server-side input validation.
- Seat availability checks before approving requests.
- Secure password handling.
- Environment variables used for sensitive configuration.

##

## 👨‍💻 Developer

**Saurabh Pandey**

MCA Student | National Institute of Technology, Agartala

- GitHub: [codersSaurabh](https://github.com/codersSaurabh)



---

⭐ If you find this project interesting, consider giving the repository a star!
