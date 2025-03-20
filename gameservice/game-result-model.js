const mongoose = require('mongoose');

const gameResultSchema = new mongoose.Schema({
    user_id: String,
    subject: String,
    points_gain: Number,
    number_of_questions: Number,
    number_correct_answers: Number,
    total_time: Number
})
const GameInfo = mongoose.model('GameInfo', gameResultSchema);

module.exports = GameInfo