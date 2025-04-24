const express = require("express")
const http = require("http")
const cors = require("cors")
const mongoose = require("mongoose")
const { initializeSocket } = require("./socket/socketHandler")

const app = express()
const server = http.createServer(app)
const io = initializeSocket(server)

const sharedQuizSessionRouter = require("./routers/RouterGameSession")(io)

// Middleware
app.use(cors())
app.use(express.json())

// Connect to MongoDB
mongoose
    .connect(process.env.MONGODB_URI || "mongodb://mongodb:27017/game", {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err))

// Routes
app.use("/wihoot", sharedQuizSessionRouter)

// Health check
app.get("/health", (req, res) => {
    res.json({ status: "OK" })
})

// Start server
const PORT = 8006
server.listen(PORT, () => {
    console.log(`Wihoot service running on port ${PORT}`)
})

module.exports = server
