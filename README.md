# 🚀 wichat_en2b
[![CI Status](https://github.com/Arquisoft/wichat_en2b/workflows/CI%20for%20wichat_en2b/badge.svg)](https://github.com/Arquisoft/wichat_en2b/actions)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=Arquisoft_wichat_en2b&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=Arquisoft_wichat_en2b)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=Arquisoft_wichat_en2b&metric=coverage)](https://sonarcloud.io/summary/new_code?id=Arquisoft_wichat_en2b)
[![CodeScene](https://codescene.io/images/analyzed-by-codescene-badge.svg)](https://codescene.io/projects/64833)

---

<div align="center">
    <img src="https://github.com/user-attachments/assets/63b1de1f-0381-4870-b3ce-18151fe2ef7f" alt="Project Image">
</div>


## 📚 Table of Contents

* [🚀 Overview](#-overview)
* [👥 Team Members](#-team-members)
* [🌟 Features](#-features)
* [🏗️ Architecture](#️-architecture)
* [🛠️ Tech Stack](#️-tech-stack)
* [⚙️ Setup & Deployment](#️-setup--deployment)
    * [Prerequisites](#prerequisites)
    * [Environment Variables](#environment-variables)
    * [Local Setup](#local-setup)
    * [Running with Docker Compose](#running-with-docker-compose)
    * [Manual Setup](#manual-setup)
* [🧪 Testing & Quality Assurance](#-testing--quality-assurance)
* [📊 Monitoring & Observability](#-monitoring--observability)
* [📈 Performance Testing](#-performance-testing)
* [🌐 Live Deployment](#-live-deployment)

---

## 🚀 Overview

**wichat_en2b** is an engaging, microservices-based quiz game application developed as a capstone project for the Software Architecture course (2024/2025) at the University of Oviedo.

It aims to provide a fun and social quiz experience with modern features, demonstrating a robust, scalable architecture. Key aspects include secure user management, dynamic group functionalities for collaborative play, and integrated AI capabilities to provide intelligent in-game hints without giving away direct answers. The application is built leveraging Node.js and Express for the backend services, React for a dynamic frontend, and MongoDB as the database.

---

## 👥 Team Members

| Name | GitHub Profile |
|------|----------------|
| Ignacio Hovan Rojas | <a href="https://github.com/HovanRojasIgnacio"><img src="https://img.shields.io/badge/UO295341-HovanRojasIgnacio-blue"></a> |
| Adrián Martínez Fuentes | <a href="https://github.com/adrianmfuentes"><img src="https://img.shields.io/badge/UO295454-adrianmfuentes-green"></a> |
| Carlos Fernández Martínez |	<a href="https://github.com/carlosfernandezmartinez"><img src="https://img.shields.io/badge/UO293564-carlosfernandezmartinez-red"></a> |
| David Pedregal Ribas | 	<a href="https://github.com/DavidPedregal"><img src="https://img.shields.io/badge/UO293738-DavidPedregal-orange"></a> |
| Francisco Cimadevilla Cuanda | <a href="https://github.com/franCimadevilla"><img src="https://img.shields.io/badge/UO294768-franCimadevilla-yellow"></a> |
| Sergio Riesco Collar | <a href="https://github.com/sergio-riesco"><img src="https://img.shields.io/badge/UO294343-sergio--riesco-purple"></a> |
| Pelayo Sierra Lobo | <a href="https://github.com/pelayosl"><img src="https://img.shields.io/badge/UO294217-pelayosl-cyan"></a> |

---

## 🌟 Features

Here are some of the standout features of wichat_en2b:

* **🔐 Secure User Management:**
    * **👤 Registration & Login:** Secure user creation and authentication using bcrypt for password hashing and JWTs for session management.
    * **🛡️ Two-Factor Authentication (2FA):** Optional layer of security using time-based one-time passwords (`otplib`) and QR code generation (`qrcode`).
    * **✏️ Profile Management:** Users can update their username, password, and profile picture URL.
    * **🖼️ Profile Pictures:** Support for uploading and retrieving user profile images.
* **👥 Group Functionality:**
    * **➕ Creation & Management:** Easily create, rename, and manage private groups. Group deletion is restricted to the owner.
    * **🚪 Joining & Leaving:** Users can join and leave groups to play together.
    * **🏆 Group Leaderboards:** View group-specific leaderboards showing member performance.
* **🎮 Dynamic Quiz Gameplay:**
    * **📚 Topic Selection:** Users can choose from various quiz topics/categories. New topics can be added via Wikidata integration.
    * **❓ Question Generation:** Questions are fetched dynamically, providing variety. Includes generating fake answers for multiple-choice format.
    * **✅ Answer Validation:** Real-time validation of user answers.
* **💡 AI-Powered Hints:**
    * **🧠 Contextual Assistance:** Integrated Large Language Model (LLM) service provides intelligent hints related to the current question, designed to guide the user without revealing the direct answer.
* **📈 Statistics & Leaderboards:**
    * **📊 Personal Statistics:** Track and view your game performance (points, time, etc.) globally and by subject.
    * **🌍 Global Leaderboards:** See how you rank against all other players.
* **🛡️ Robust API Gateway:**
    * **🚪 Single Entry Point:** All client requests are routed through the Gateway.
    * **🩺 Monitoring Endpoints:** Provides `/metrics` for Prometheus and `/health` for status checks.
    * **📖 API Documentation:** Interactive Swagger/OpenAPI documentation available at `/api-doc`.

---

## 🏗️ Architecture

wichat_en2b employs a **microservices architecture** to provide scalability, resilience, and maintainability. The services communicate primarily via REST APIs, coordinated by an API Gateway.

The core components are:

* **Gateway Service:**
    * **Role:** Acts as the central point of entry for all client requests. Routes incoming traffic to the appropriate backend services.
    * **Responsibilities:** Handles CORS, provides monitoring endpoints (`/metrics`, `/health`), and serves API documentation (`/api-doc`). Utilizes `http-proxy-middleware`.
* **User Service:**
    * **Role:** Manages all user-related data and operations.
    * **Responsibilities:** User CRUD operations, profile updates (username, password, picture URL, 2FA secret), profile picture uploads/retrieval, fetching user details. Uses JWT middleware for authentication.
* **Auth Service:**
    * **Role:** Handles user authentication and authorization.
    * **Responsibilities:** User registration and login (with bcrypt validation), JWT token generation and verification, 2FA setup and validation (`otplib`, `qrcode`).
* **Group Service:**
    * **Role:** Manages groups and group-related interactions.
    * **Responsibilities:** Group creation, searching (all, user's, by name), updating names, deletion (owner-only), joining, leaving, and fetching data required for group leaderboards by coordinating with the Game Service.
* **Game Service:**
    * **Role:** Contains the core quiz game logic and data.
    * **Responsibilities:** Manages quiz topics (fetching, adding via Wikidata), retrieves and formats questions (including fake answers), validates user answers, stores game results, calculates global and subject-specific user statistics, and serves leaderboards.
* **LLM Service:**
    * **Role:** Interfaces with external Large Language Models.
    * **Responsibilities:** Provides an `/askllm` endpoint to generate contextual hints for quiz questions based on game state and conversation history, ensuring hints do not directly give away the answer. Integrates with APIs like Google Gemini or Empathy AI.
* **Webapp:**
    * **Role:** The client-side user interface.
    * **Responsibilities:** Provides the interactive experience for users to register, log in, play the quiz, manage their profile, join groups, and view statistics and leaderboards. Communicates with the backend via the API Gateway using React.

**Shared Database:** The User, Auth, Group, and Game services share a single MongoDB database instance, accessed via Mongoose ODM, serving as the central data store for user profiles, groups, quiz data, and game results.

---

## 🛠️ Tech Stack

wichat_en2b is built using a modern and popular technology stack:

* **Backend Framework:** Node.js with Express.js
* **Database:** MongoDB (using Mongoose ODM)
* **Frontend Library:** React
* **Authentication:** JWT (`jsonwebtoken`), bcrypt
* **Two-Factor Auth:** otplib, qrcode
* **API Gateway:** `http-proxy-middleware`
* **Inter-Service Communication:** Axios / Fetch API
* **External Integrations:** Wikidata API (for topic/question data), Google Gemini API, Empathy AI API (for LLM hints)
* **Monitoring:** `express-prom-bundle` for Prometheus metrics
* **API Documentation:** Swagger UI (`swagger-ui-express`) and YAML specification
* **Security:** Helmet middleware for HTTP headers
* **Image Processing:** Sharp (potentially used for profile picture handling)

---

## ⚙️ Setup & Deployment

To get wichat_en2b running locally or understand its deployment:

### Prerequisites

Ensure you have the following installed:

* Git
* Node.js (LTS version recommended) and npm
* Docker and Docker Compose (for the recommended setup method)
* A MongoDB instance running (if not using Docker Compose)

### Environment Variables

Each service requires specific environment variables for configuration (e.g., database connection strings, JWT secrets, API keys). Create `.env` files in the root directory of each service (`/gateway`, `/users`, `/auth`, etc.).

### Local Setup

1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/Arquisoft/wichat_en2b.git](https://github.com/Arquisoft/wichat_en2b.git)
    cd wichat_en2b
    ```

2.  **Set Up Environment Variables:**
    * Navigate into each service directory (e.g., `cd gateway`).
    * Create a `.env` file based on the required variables for that service.
    * Repeat for all service directories (`auth`, `users`, `groups`, `game`, `llm`, `webapp`).

### Running with Docker Compose (Recommended for Development)

Docker Compose simplifies running all services and the database together.

```bash
# Ensure you are in the root directory of the cloned repository
docker compose --profile dev up --build
```
Once the services are running (it might take a moment for all of them to start), the application should be accessible:

* **🌐 Webapp Frontend:** Usually available at `http://localhost:3000` (or the port specified in the `webapp` config/env).
* **🚪 API Gateway:** Usually available at a different port, e.g., `http://localhost:8000`. The frontend communicates with the Gateway.
* **📖 Swagger Docs:** Accessible via the Gateway, e.g., `http://localhost:8000/api-doc`.
* **📊 Prometheus Metrics:** Accessible via the Gateway, e.g., `http://localhost:8000/metrics`.
* **🩺 Health Checks:** Accessible via the Gateway, e.g., `http://localhost:8000/health`.

To stop the services:

```bash
docker compose down
```

### Manual Setup (Alternative)

If you prefer not to use Docker Compose for services (you'll still likely need a MongoDB instance running locally or via Docker), you can start each component manually:

1.  **Start MongoDB:**
    Install MongoDB locally OR run a MongoDB container:
    ```bash
    docker run -d -p 27017:27017 --name=my-mongo mongo:latest
    ```

2.  **Start Each Service:**
    * Navigate into each service directory (e.g., `cd gateway`).
    * Install dependencies: `npm install`
    * Start the service: `npm start`
    * Repeat for `auth`, `users`, `groups`, `game`, `llm`. Ensure the MongoDB database is running and accessible and that their respective `.env` files correctly point to the database and other services.

3.  **Start the Webapp:**
    * Navigate into the `webapp` directory: `cd webapp`
    * Install dependencies: `npm install`
    * Start the development server: `npm start`

Ensure the environment variables in each service's `.env` file point to the correct addresses (e.g., the Auth service URL in the Gateway's `.env`, the MongoDB URI in the backend services' `.env`).

## 🧪 Testing & Quality Assurance

The project incorporates various practices to ensure code quality and reliability:

* **🤖 Continuous Integration (CI):** GitHub Actions workflows are configured to automatically build the project and run tests on every push and pull request, ensuring that changes don't introduce regressions.
* **⚙️ Automated Testing:** Includes:
    * **Unit Tests:** Testing individual functions and modules in isolation to ensure they perform as expected.
    * **Integration Tests:** Verifying the interaction between different components and services.
    * **End-to-End Tests:** Simulating user interactions with the full application stack to ensure key user flows work correctly.
* **🔍 Code Quality Analysis:** Integration with SonarCloud provides automated analysis for code smells, potential bugs, security vulnerabilities, and technical debt, helping maintain a high standard of code quality.
* **🗺️ Code Scene Analysis:** Integration with CodeScene helps visualize the codebase's evolutionary trends, identify hotspots, and manage technical debt effectively by understanding code complexity and developer activity patterns.
* **🎯 Code Coverage:** Test coverage is tracked and reported via SonarCloud to ensure that a significant portion of the codebase is covered by automated tests, reducing the risk of untested code paths containing bugs.

## 📊 Monitoring & Observability

Monitoring is crucial in a microservices architecture to understand the system's health and performance:

* **📈 Prometheus Metrics:** Each service exposes a `/metrics` endpoint (accessible via the Gateway) providing key performance indicators (e.g., request duration, error rates, active users, quiz game counts). These metrics can be scraped by a Prometheus server for collection and analysis.
* **❤️ Health Checks:** Each service provides a `/health` endpoint (accessible via the Gateway) to report its operational status. This is vital for monitoring systems and container orchestrators to determine if a service is healthy and ready to receive traffic.
* **📖 API Documentation:** Comprehensive and interactive API documentation is available via Swagger UI at the Gateway's `/api-doc` endpoint, serving as a crucial tool for developers and testers to understand and interact with the available APIs.

## 📈 Performance Testing

* **🏋️ Load Testing:** Gatling simulations are included in the `gatling` folder to evaluate the application's performance, scalability, and resilience under various load conditions. Running these tests helps identify bottlenecks and understand how the system behaves under stress.

## 🌐 Live Deployment

The application is deployed at: [wichat.ddns.net](http://wichat.ddns.net)

---
