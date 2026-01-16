# Chatbot Backend (LLM Agent Platform)

This is the backend service for a multi-user chatbot platform. It handles authentication, project management, file uploads, and communication with LLM providers via OpenRouter.

---

## Features

* JWT-based authentication (Register / Login)
* Secure password hashing using bcrypt
* Create and manage chatbot projects (agents)
* Store system prompts per project
* Chat with LLMs using OpenRouter API
* Upload PDF files and inject content into chat context
* CORS-secured API
* MongoDB Atlas integration
* Production-ready deployment on Railway

---

## Tech Stack

* **Node.js**
* **Express.js**
* **MongoDB + Mongoose**
* **JWT Authentication**
* **OpenRouter API**
* **Multer (File Uploads)**
* **pdf-parse**
* **dotenv**

---

## Project Structure

```
ChatBot-Backend/
├── middleware/
│   └── useAuth.js
├── models/
│   ├── user.js
│   └── project.js
├── routes/
│   └── api.js
├── server.js
├── package.json
└── .env
```

---

## Environment Variables

Create a `.env` file in the root:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
OPENROUTER_API_KEY=your_openrouter_api_key
```

---

## Running Locally

```bash
git clone https://github.com/ankurbaijal123/ChatBot-Backend.git
cd ChatBot-Backend
npm install
npm start
```

Server will start at:

```
http://localhost:5000
```

---

## Authentication

* Uses JWT tokens
* Token must be sent in header:

```http
Authorization: Bearer <JWT_TOKEN>
```

* Protected routes require authentication middleware

---

## Chat API Flow

1. User sends message + optional PDF file
2. PDF is parsed and converted to text
3. Content is injected as system context
4. Request forwarded to OpenRouter LLM
5. Response returned to client

---

## 🌐 API Endpoints

| Method | Route          | Description                         |
| ------ | -------------- | ----------------------------------- |
| POST   | /auth/register | Register user                       |
| POST   | /auth/login    | Login user                          |
| POST   | /projects      | Create project                      |
| GET    | /projects      | Get user projects                   |
| POST   | /chat          | Chat with LLM (supports PDF upload) |

---

## Deployment

* Backend hosted on **Railway**
* MongoDB hosted on **MongoDB Atlas**

Live URL:

```
https://chatbot-backend-production-1e11.up.railway.app
```

---

## 🛡 Security Notes

* Passwords hashed using bcrypt
* JWT tokens for stateless auth
* Secrets stored in environment variables
* CORS restricted to frontend domain
