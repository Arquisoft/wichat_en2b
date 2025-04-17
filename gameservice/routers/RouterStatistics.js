const express = require('express');
const router = express.Router();
const GameInfo = require('../game-result-model.js');
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
            { $group: { // Full player database
                    _id: '$user_id',
                    totalScore: { $sum: '$points_gain' },
                    totalGames: { $sum: 1 },
                    avgScore: { $avg: '$points_gain' }
                }},
            { $sort: { totalScore: -1 }}, // Sorted by score
            {
                $setWindowFields: { // Adds a rank attribute to every user
                    sortBy: { totalScore: -1 },
                    output: {
                        rank: { $rank: {} }
                    }
                }
            },
            {
                $match: { // Gets top 10 and user (11 users if user is not in top 10)
                    $or: [
                        { rank: { $lte: 10 } },
                        { _id: req.user.username }
                    ]
                }
            },
            {
                $lookup: { // Gets userDetails for the leaderboard
                    from: 'users',
                    localField: '_id',
                    foreignField: 'username',
                    as: 'userDetails'
                }
            },
            {
                $addFields: { // Adds only the username
                    username: { $first: '$userDetails.username' }
                }
            },
            {
                $project: { // Removes the rest of the user details
                    userDetails: 0
                }
            },
            {
                $sort: { rank: 1 } // Sorts by rank
            }
        ]);

        res.json({ leaderboard });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching leaderboard' });
    }
});

module.exports = router;