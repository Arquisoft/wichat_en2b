const express = require('express');
const router = express.Router();
const GameInfo = require('../game-result-model.js');
const verifyToken = require('./middleware/auth');

// statistics filtered by subject
router.get('/statistics/subject/:subject', verifyToken, async (req, res) => {
    try{
        const stats = await GameInfo.aggregate([
            { $match: {
                user_id: req.user._id,
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
                user_id: req.user._id
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

router.get('/statistics/recent-quizzes', verifyToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 0;
        const limit = 5;
        const recentQuizzes = await GameInfo.find({ user_id: req.user._id })
            .sort({ _id: -1 })
            .skip(page * limit)
            .limit(limit);

        const hasMoreQuizzes = recentQuizzes.length === limit;

        res.json({ recentQuizzes, hasMoreQuizzes });
    } catch (error) {
        console.error('Error retrieving recent quizzes:', error);
        res.status(500).json({ error: 'Error retrieving recent quizzes' });
    }
})

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
                        { _id: req.user._id }
                    ]
                }
            },
            {
                $lookup: { // Gets userDetails for the leaderboard
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userDetails'
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

router.post('/leaderboard/group', verifyToken, async (req, res) => {
    if (!req.body.players || !Array.isArray(req.body.players)) {
        return res.status(400).json({ error: 'Invalid request body' });
    }

    const players = req.body.players; // array de usernames
  
    try {
        const leaderboard = await GameInfo.aggregate([
            {
                $match: { user_id: { $in: players } } // solo partidas de los jugadores dados
            },
            {
                $group: { // Full player database
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
                $lookup: { // Gets userDetails for the leaderboard
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userDetails'
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
        res.status(200).json({ leaderboard });
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Error fetching player leaderboard' });
    }
});

router.post('/leaderboard/calculateGroupScores', verifyToken, async (req, res) => {
    try {
      const { groups } = req.body;
      
      // Calcular puntuaciones para cada grupo
      const groupsWithScores = [];
      
      for (const group of groups) {
        let totalPoints = 0;
        
        // Calcular puntos para cada miembro del grupo
        for (const memberId of group.members) {
          const memberResults = await GameInfo.find({ user_id: memberId });
          const memberPoints = memberResults.reduce((sum, result) => sum + result.points_gain, 0);
          totalPoints += memberPoints;
        }
        
        // Añadir información del grupo con la puntuación
        groupsWithScores.push({
          ...group,
          totalPoints
        });
      }
      
      res.status(200).json({
        success: true,
        data: groupsWithScores
      });
    } catch (error) {
      console.error('Error en calculateGroupScores:', error);
      res.status(500).json({
        success: false,
        message: 'Error al calcular puntuaciones de grupos',
        error: error.message
      });
    }
});


module.exports = router;