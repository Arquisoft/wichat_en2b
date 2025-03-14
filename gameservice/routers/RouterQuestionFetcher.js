const express = require('express');
const Question = require('../question-model');
const fs = require('fs');
const router = express.Router();

const wikiDataUri = "https://query.wikidata.org/sparql?format=json&query=";

router.get('/generate/:type/:amount', async (req, res) => {
    // Query for fetching items of a specific type from Wikidata
    var itemType = req.params['type'];
    var amount = req.params['amount'];
    const query = `
        SELECT ?item ?itemLabel ?image WHERE {
            ?item wdt:P31 wd:${itemType}.  # Item type or subclass of item type
            ?item wdt:P18 ?image.  # Item image (compulsory)
            SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        }
        LIMIT ${amount}
    `;

    try {
        // Fetch data from Wikidata
        const url = wikiDataUri + encodeURIComponent(query);
        const response = await fetch(url, {
            headers: {
              'User-Agent': 'wichat_en2b/1.0'
            }
        });
        
        // Parse JSON response
        const data = await response.json();

        // Filter out items with missing data
        const items = data.results.bindings.filter(item => {
            const itemId = item.item.value.split('/').pop();
            return item.itemLabel.value != null && item.image.value != null 
            && !/^Q\d+$/.test(item.itemLabel.value) && itemId != item.itemLabel.value;
        }).map(item => ({
                name: item.itemLabel.value,
                image: item.image.value
            }));
        // Check if items are empty (invalid type or no results)
        if (items.length === 0) {
            throw new Error('No valid items found for the given type');
        }

        // Save items to database and images to disk
        await saveQuestionsToDB(items, itemType);
        
        return res.status(200).json({ message: '✅ Data fetched successfully', items: items }); 
    } catch (error) {
        console.error('❌ Error fetching data:', error);
        return res.status(500).json({ error: '❌ Failed to retrieve data' });
    }
});

async function saveQuestionsToDB(items, code) {
    // Ensure the images directory exists
    const imagesDir = './public/images/';
    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
    }
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

            // Save image to disk
            const imageResponse = await fetch(item.image);
            const arrayBuffer = await imageResponse.arrayBuffer();
            const imageBuffer = Buffer.from(arrayBuffer);
            fs.writeFile(`./public/images/${question._id.toString()}.jpg`, imageBuffer, () => {});
        }
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

module.exports = router;