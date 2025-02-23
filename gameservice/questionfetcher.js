const express = require('express');
const mongoose = require('mongoose');
const Question = require('./question-model');
const fetch = require('node-fetch');

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
            OPTIONAL { ?city wdt:P18 ?image. }  # City image
            SERVICE wikibase:label { bd:serviceParam wikibase:language "es". }
        }
        LIMIT 100
    `;

    try {
        const response = await fetch(wikiDataUri + encodeURIComponent(query));
        const data = await response.json();
        
        const cities = data.results.bindings.map(item => ({
            name: item.cityLabel?.value || "Unknown",
            image: item.image?.value || null
        }));

        res.json(cities);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Failed to retrieve data' });
    }
});

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
})