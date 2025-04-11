const express = require('express');
const Question = require('../question-model');
const fs = require('fs');
const router = express.Router();
const saveQuestionsToDB = require('./help/util');

const wikiDataUri = "https://query.wikidata.org/sparql?format=json&query=";

router.get('/generate/:type/:amount', async (req, res) => {
    // Query for fetching items of a specific type from Wikidata
    let itemType = req.params['type'];
    let amount = req.params['amount'];
    const query = `
        SELECT DISTINCT ?item ?itemLabel ?image WHERE {
            ?item wdt:P31 wd:${itemType}.  # Item type or subclass of item type
            ?item wdt:P18 ?image.  # Item image (compulsory)
            SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        }
        LIMIT ${amount}
    `;

    try {
        // Save items to database and images to disk
        const items = await saveQuestionsToDB(itemType, query);
        
        return res.status(200).json({ message: '✅ Data fetched successfully', items: items }); 
    } catch (error) {
        console.error('❌ Error fetching data:', error);
        return res.status(500).json({ error: '❌ Failed to retrieve data' });
    }
});


module.exports = router;