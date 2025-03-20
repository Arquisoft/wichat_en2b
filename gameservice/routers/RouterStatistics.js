const express = require('express');
const router = express.Router();
const GameInfo = require('../game-result-model');
const verifyToken = require('./middleware/auth');

// statistics filtered by subject
router.get('/statistics/subject/:subject', verifyToken, async (req, res) => {
    try{
        const stats = await GameInfo.aggregate([
            { $match: {
                user_id: req.user.username,
                subject: req.params.subject
            }},
            { $group: {
                _id: "$subject",
                totalGames: { $sum: 1 },
                avgScore: { $avg: '$points_gain' },
                totalCorrectAnswers: { $sum: '$number_correct_answers' },
                totalQuestions: { $sum: '$number_of_questions' },
                avgTime: { $avg: '$total_time' }
            }}
        ]);
        res.json({
            subject: req.params.subject,
            stats: stats[0] || null
        });
    } catch (error) {
        res.status(500).json({ error: 'Error retrieving statistics' });
    }
});