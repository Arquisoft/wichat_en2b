const express = require('express');
const Question = require('../question-model');
const fs = require('fs');
const router = express.Router();

const wikiDataUri = "https://query.wikidata.org/sparql?format=json&query=";

router.get('/generate/:type/:amount', async (req, res) => {
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
        const url = wikiDataUri + encodeURIComponent(query);
        const response = await fetch(wikiDataUri + encodeURIComponent(query), {
            headers: {
              'User-Agent': 'wichat_en2b/1.0'
            }
        });
          
        const data = await response.json();

        const items = data.results.bindings.filter(item => item.itemLabel.value != null && item.image.value != null 
            && item.item.value.split('/')[item.item.value.split('/').size - 1] != item.itemLabel.value)
            .map(item => ({
                name: item.itemLabel.value,
                image: item.image.value
            }));

        await saveQuestionstoDB(items, itemType);
        return res.status(200).json({ message: '✅ Data fetched successfully' }); 

    } catch (error) {
        console.error('❌ Error fetching data:', error);
        return res.status(500).json({ error: '❌ Failed to retrieve data' });
    }
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
            const arrayBuffer = await imageResponse.arrayBuffer();
            const imageBuffer = Buffer.from(arrayBuffer);
            fs.writeFile(`./public/images/${question._id.toString()}.jpg`, imageBuffer, () => {});
        }
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

module.exports = router;