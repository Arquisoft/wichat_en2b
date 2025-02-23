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

app.get('/generate', async (req, res) => {
    const query = `
        SELECT ?city ?cityLabel ?image WHERE {
            ?city wdt:P31 wd:Q515.  # Cities
            ?city wdt:P18 ?image.  # City image (compulsory)
            SERVICE wikibase:label { bd:serviceParam wikibase:language "es". }
        }
        LIMIT 2
    `;

    try {
        const response = await fetch(wikiDataUri + encodeURIComponent(query));
        const data = await response.json();
        
        const cities = data.results.bindings.filter(item => item.cityLabel.value != null && item.image.value != null).map(item => ({
            name: item.cityLabel.value,
            image: item.image.value
        }));

        saveQuestionstoDB(cities);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Failed to retrieve data' });
    }
});

async function saveQuestionstoDB(cities) {
    try {
        for (const city of cities) {
            var question = await Question.findOne({ subject: "city", answer: city.name });

            if (!question) {
                question = new Question({
                    subject: "city",
                    answer: city.name
                });
            } else {
                question.subject = "city";
                question.answer = city.name;
                question.__v = question.__v + 1;
            }

            await question.save();

            const imageResponse = await fetch(city.image);
            const imageBuffer = await imageResponse.buffer();
            fs.writeFile(`./public/images/${question._id.toString()}.jpg`, imageBuffer, () => {
                console.log(`Image for ${city.name} saved`);
            });
        }
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
})