const mongoose = require("mongoose")
const Question = require("../../gameservice/question-model")

const PlayerSchema = new mongoose.Schema({
    id: String,
    name: String,
    score: {
        type: Number,
        default: 0,
    },
})

const SessionSchema = new mongoose.Schema(
    {
        gameCode: {
            type: String,
            required: true,
            unique: true,
        },
        quizId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Quiz",
            required: true,
        },
        hostId: {
            type: String,
            required: true,
        },
        players: [PlayerSchema],
        currentQuestionIndex: {
            type: Number,
            default: -1, // -1 means in lobby
        },
        started: {
            type: Boolean,
            default: false,
        },
        ended: {
            type: Boolean,
            default: false,
        },
        startedAt: Date,
        endedAt: Date,
    },
    {
        timestamps: true,
    },
)