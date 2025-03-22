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
                totalScore: { $sum: '$points_gain' },
                totalCorrectAnswers: { $sum: '$number_correct_answers' },
                totalQuestions: { $sum: '$number_of_questions' },
                avgTime: { $avg: '$total_time' },
                successRatio: {
                        $avg: {
                            $divide: ['$number_correct_answers', '$number_of_questions']
                        }
                }
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

// global statistics
router.get('/statistics/global', verifyToken, async (req, res) => {
    try{
        const stats = await GameInfo.aggregate([
            { $match: {
                user_id: req.user.username
            }},
            { $group: {
                _id: null,
                totalGames: { $sum: 1 },
                avgScore: { $avg: '$points_gain' },
                totalScore: { $sum: '$points_gain' },
                totalCorrectAnswers: { $sum: '$number_correct_answers' },
                totalQuestions: { $sum: '$number_of_questions' },
                avgTime: { $avg: '$total_time' },
                successRatio: {
                        $avg: {
                            $divide: ['$number_correct_answers', '$number_of_questions']
                        }
                }
            }}
        ]);
        res.json({
            stats: stats[0] || null
        });
    } catch (error) {
        res.status(500).json({ error: 'Error retrieving statistics' });
    }
});

// leaderboard
router.get('/leaderboard', verifyToken, async (req, res) => {
    try {
        const leaderboard = await GameInfo.aggregate([
            { $group: {
                    _id: '$user_id',
                    totalScore: { $sum: '$points_gain' },
                    totalGames: { $sum: 1 },
                    avgScore: { $avg: '$points_gain' }
                }},
            { $sort: { totalScore: -1 }},
            { $limit: 15 }
        ]);

        res.json({ leaderboard });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching leaderboard' });
    }
});

module.exports = router;