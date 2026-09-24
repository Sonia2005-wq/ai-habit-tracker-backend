# AI Habit Tracker

An AI-powered habit tracking backend built with Node.js, Express, MongoDB and Google Gemini.

## Features

- User registration and login
- JWT authentication
- Habit creation and management
- Habit completion tracking
- Streak calculation
- AI-generated weekly reports
- AI habit suggestions
- AI recovery plans
- AI chat analysis
- Morning motivation

## Tech Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- Google Gemini API
- date-fns

## Project Structure

config/
controllers/
middleware/
models/
routes/
utils/
server.js

## Environment Variables

Create a `.env` file:

MONGO_URL=your_mongodb_url
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=30d
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.6-flash
CLIENT_URL=http://localhost:5173

## Run Locally

npm install

npm run dev
