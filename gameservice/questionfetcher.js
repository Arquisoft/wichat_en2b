const express = require('express');
const mongoose = require('mongoose');
const Question = require('./question-model');
const fetch = require('node-fetch');
const fs = require('fs');

const port = 8004;

const app = express();

// Establis connection to MongoDB game database
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/game';
mongoose.connect(mongoUri);

const wikiDataUri = "https://query.wikidata.org/sparql?format=json&query=";

app.get('/generate/:type/:amount', async (req, res) => {
    var itemType = req.params['type'];
    var amount = req.params['amount'];
    const query = `
        SELECT ?item ?itemLabel ?image WHERE {
            ?item wdt:P31/wdt:P279* wd:${itemType}.  # Item type or subclass of item type
            ?item wdt:P18 ?image.  # Item image (compulsory)
            SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        }
        LIMIT ${amount}
    `;

    try {
        const response = await fetch(wikiDataUri + encodeURIComponent(query));
        const data = await response.json();

        const items = data.results.bindings.filter(item => item.itemLabel.value != null && item.image.value != null 
            && item.item.value.split('/')[item.item.value.split('/').size - 1] != item.itemLabel.value)
            .map(item => ({
                name: item.itemLabel.value,
                image: item.image.value
            }));

        saveQuestionstoDB(items, itemType);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Failed to retrieve data' });
    }

    res.status(200).json({ message: 'Data fetched successfully' });
});

async function saveQuestionstoDB(items, code) {
    try {
        for (const item of items) {
            var question = await Question.findOne({ subject: code, answer: item.name });

            if (!question) {
                question = new Question({
                    subject: code,
                    answer: item.name
                });
            } else {
                question.subject = code;
                question.answer = item.name;
                question.__v = question.__v + 1;
            }

            await question.save();

            const imageResponse = await fetch(item.image);
            const imageBuffer = await imageResponse.buffer();
            fs.writeFile(`./public/images/${question._id.toString()}.jpg`, imageBuffer, () => {});
        }
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
})