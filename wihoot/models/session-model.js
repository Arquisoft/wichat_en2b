const mongoose = require("mongoose")

const PlayerSchema = new mongoose.Schema({
    id: String,
    name: String,
    score: {
        type: Number,
        default: 0,
    }, answers: {
        type: Array,
        default: new Array(),
    },
    isGuest: {
        type: Boolean,
        default: false,
    }
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
        }, questions: {
            type: Array,
            default: new Array(),
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

const Session = mongoose.model('Session', SessionSchema);
const Player = mongoose.model('Player', PlayerSchema);

module.exports = { Session, Player }