
# 🚀 wichat_en2b

[![CI Status](https://github.com/Arquisoft/wichat_en2b/workflows/CI%20for%20wichat_en2b/badge.svg)](https://github.com/Arquisoft/wichat_en2b/actions)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=Arquisoft_wichat_en2b&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=Arquisoft_wichat_en2b)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=Arquisoft_wichat_en2b&metric=coverage)](https://sonarcloud.io/summary/new_code?id=Arquisoft_wichat_en2b)
[![CodeScene](https://codescene.io/images/analyzed-by-codescene-badge.svg)](https://codescene.io/projects/64833)

<p align="center">
  <img src="https://nodejs.org/static/images/logo.svg" height="80" alt="Node.js Logo">
  <img src="https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg" height="80" alt="React Logo">
  <img src="https://webassets.mongodb.com/_com_assets/cms/mongodb_logo1-76twgcu2dm.png" height="80" alt="MongoDB Logo">
</p>

---

## 🌟 Overview

**wichat_en2b** is a microservices-based quiz game application developed as part of the Software Architecture course (2024/2025) at the University of Oviedo. It features user management, group functionalities, and AI-powered hints, all built with a modern backend architecture using Node.js and Express.

---

## 👥 Team Members

| Name | GitHub Profile |
|------|----------------|
| Hovan Rojas Ignacio | <a href="https://github.com/HovanRojasIgnacio"><img src="https://img.shields.io/badge/UO295341-HovanRojasIgnacio-blue"></a> |
| Adrián Martínez Fuentes | <a href="https://github.com/adrianmfuentes"><img src="https://img.shields.io/badge/UO295454-adrianmfuentes-green"></a> |
| Carlos Fernández Martínez |	<a href="https://github.com/carlosfernandezmartinez"><img src="https://img.shields.io/badge/UO293564-carlosfernandezmartinez-red"></a> |
| David Pedregal Ribas | 	<a href="https://github.com/DavidPedregal"><img src="https://img.shields.io/badge/UO293738-DavidPedregal-orange"></a> |
| Francisco Cimadevilla Cuanda | <a href="https://github.com/franCimadevilla"><img src="https://img.shields.io/badge/UO294768-franCimadevilla-yellow"></a> |
| Sergio Riesco Collar | <a href="https://github.com/sergio-riesco"><img src="https://img.shields.io/badge/UO294343-sergio--riesco-purple"></a> |
| Pelayo Sierra Lobo | <a href="https://github.com/pelayosl"><img src="https://img.shields.io/badge/UO294217-pelayosl-cyan"></a> |

---

## 🏗️ Architecture & Components

The system employs a microservices architecture coordinated by an API Gateway:

- **Gateway Service**: Acts as the primary entry point, routing client requests to appropriate backend services, managing CORS, providing Prometheus metrics, health checks, and serving API documentation via Swagger/OpenAPI.

- **User Service**: Handles all user-related operations, including CRUD, profile updates (username, password, picture URL, 2FA secret), profile picture management (upload/retrieval), and fetching users by ID or username. Utilizes JWT middleware for authentication.

- **Auth Service**: Manages authentication flows such as login/registration (with password validation), JWT generation/verification, and optional Two-Factor Authentication (2FA) setup & validation via `otplib` and `qrcode`.

- **Group Service**: Facilitates group management, including creation, finding groups (all, user's joined group, by name), updating names, deletion (owner restricted), joining/leaving, and fetching data for group leaderboards by coordinating with the Game Service.

- **Game Service**: Core logic for the quiz game:
  - Manages quiz topics/categories (fetching, adding via Wikidata queries).
  - Retrieves questions for gameplay (randomized, with fake answers).
  - Validates user answers.
  - Stores game results (points, time, etc.).
  - Calculates and serves user statistics (global/subject) and leaderboards.

- **LLM Service**: Interfaces with external Large Language Models (e.g., Google Gemini, Empathy AI) via the `/askllm` endpoint. Generates contextual hints for quiz questions based on conversation history and game data, avoiding giving away the direct answer.

- **Webapp**: React web application that uses the Gateway Service to allow basic login and new user features, and provides the user interface for the quiz game and other functionalities.

User, Auth, Group and Game services share a MongoDB database accessed with Mongoose.

---

## ✨ Key Features

- Secure User Registration & Login (bcrypt hashing).
- JWT-based Authentication for API routes.
- Optional Two-Factor Authentication (2FA).
- User Profile Management (Username, Password, Profile Picture).
- Group Creation, Joining, Leaving, and Management.
- Dynamic Quiz Gameplay (Topic Selection, Question Fetching, Answer Validation).
- AI-Powered In-Game Hints.
- Tracking and Viewing Personal Game Statistics.
- User & Group Leaderboards.
- API Documentation via Swagger/OpenAPI (`/api-doc`).
- Monitoring via Prometheus Metrics (`/metrics`) & Health Checks (`/health`).

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB (with Mongoose ODM)
- **Frontend**: React
- **Authentication**: JWT (`jsonwebtoken`), bcrypt
- **2FA**: otplib, qrcode
- **API Gateway**: `http-proxy-middleware`
- **Communication**: Axios / Fetch API
- **External APIs**: Wikidata, Google Gemini, Empathy AI
- **Monitoring**: `express-prom-bundle` (Prometheus)
- **API Docs**: Swagger UI (`swagger-ui-express`), YAML
- **Security**: Helmet
- **Image Processing**: Sharp

---

## ⚙️ Setup & Deployment

### Local Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Arquisoft/wichat_en2b.git
   ```

2. **Install Dependencies**:
   Navigate to each service directory and run:
   ```bash
   npm install
   ```

3. **Set Up Environment Variables**:
   Create a `.env` file in each service directory with the necessary environment variables.

4. **Start MongoDB**:
   Ensure MongoDB is running locally or use a cloud provider like MongoDB Atlas.

5. **Run Services**:
   Start each service individually with:
   ```bash
   npm start
   ```
   Or use Docker Compose:
   ```bash
   docker compose --profile dev up --build
   ```

## 🧪 Testing & Quality Assurance

- **CI/CD**: GitHub Actions automate builds and tests.
- **Code Quality**: SonarCloud and CodeScene integration for code smells, maintainability metrics, and coverage tracking.
- **Load Testing**: Gatling simulations available in `gatling` folder.

---

## 📊 Monitoring & Observability

- **Prometheus Metrics**: Available at `/metrics` endpoints.
- **Health Checks**: Available at `/health` endpoints.
- **Swagger/OpenAPI**: Accessible at `/api-doc` endpoints.

---

## 📈 Performance Testing

- **Gatling**: Load testing included for performance evaluation under stress.

---

## 🌐 Live Deployment

The application is deployed at: [wichat.ddns.net](http://wichat.ddns.net)

---