const mongoose = require("mongoose")

const playerSchema = new mongoose.Schema({
    id: { type: String, required: true },
    username: { type: String, required: true },
    score: { type: Number, default: 0 },
    answers: [
        {
            questionId: String,
            answerId: String,
            isCorrect: Boolean,
            timeToAnswer: Number,
            answer: String,
            rightAnswer: String

        },
    ],
    total_time: { type: Number, default: 0 }
})

const sharedQuizSessionSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        waitingForNext: { type: Boolean, default: false },
        quizData: [],
        quizMetaData: [],
        hostId: { type: String, required: true },
        status: {
            type: String,
            enum: ["waiting", "active", "finished"],
            default: "waiting",
        },
        currentQuestionIndex: { type: Number, default: -1 },
        players: [playerSchema],
        createdAt: { type: Date, default: Date.now },
        startedAt: { type: Date },
        finishedAt: { type: Date },
    },
    { timestamps: true },
)

// Generate a random 6-character code
sharedQuizSessionSchema.statics.generateCode = () => {
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    let code = ""
    for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    return code
}

// Method to add a player to the session
sharedQuizSessionSchema.methods.addPlayer = function (player) {
    if (this.status !== "waiting") {
        throw new Error("Cannot join a session that has already started")
    }

    // Check if player already exists
    const existingPlayer = this.players.find((p) => p.id === player.id)
    if (existingPlayer) {
        return existingPlayer
    }

    this.players.push(player)
    return player
}

// Method to start the session
sharedQuizSessionSchema.methods.start = function () {
    if (this.status !== "waiting") {
        throw new Error("Session has already started or finished")
    }

    this.status = "active"
    this.startedAt = new Date()
    this.currentQuestionIndex = 0
    return this
}

// Method to move to the next question
sharedQuizSessionSchema.methods.nextQuestion = function () {
    if (this.status !== "active") {
        throw new Error("Session is not active")
    }

    this.currentQuestionIndex += 1
    return this.currentQuestionIndex
}

// Method to finish the session
sharedQuizSessionSchema.methods.finish = function () {
    if (this.status !== "active") {
        throw new Error("Session is not active")
    }

    this.status = "finished"
    this.finishedAt = new Date()
    return this
}

// Method to update the player that didn't answer before /next to incorrect
sharedQuizSessionSchema.methods.checkForNoAnswer = function () {
    if (this.status !== "active") {
        throw new Error("Session is not active")
    }
    this.players.forEach((p) => {
       try {
           if (p.answers.length < this.currentQuestionIndex+1){
               p.answers.push({
                   questionId: -1,
                   answerId: -1,
                   isCorrect: false,
                   timeToAnswer: -1,
               })
           }
           console.log("TEST answers before adding one ICORRECT; ", p);
       } catch (error) {
           throw new Error("Error when checking incorrect answers")
       }
    });
}

// Add this method to handle safe player removal
sharedQuizSessionSchema.statics.removePlayer = async function(code, playerId) {
    try {
        return await this.findOneAndUpdate(
            { code },
            { $pull: { players: { id: playerId } } },
            { new: true }
        );
    } catch (error) {
        console.error(`Error removing player ${playerId} from session ${code}:`, error);
        throw error;
    }
};

// Add this method to handle safe session deletion
sharedQuizSessionSchema.statics.deleteSession = async function(code) {
    try {
        const result = await this.findOneAndDelete({ code });
        return result;
    } catch (error) {
        console.error(`Error deleting session ${code}:`, error);
        throw error;
    }
};

const SharedQuizSession = mongoose.model("SharedQuizSession", sharedQuizSessionSchema)

module.exports = SharedQuizSession
