const express = require('express');
const Question = require('../question-model');
const fs = require('fs');
const router = express.Router();

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
    const imagesDir = './public/images';

    // Ensure images directory exists asynchronously
    await fs.promises.mkdir(imagesDir, { recursive: true });

    try {
        // Step 1: Fetch existing questions in one go to reduce DB queries
        const existingQuestions = await Question.find({ subject: code }).lean();
        const existingMap = new Map(existingQuestions.map(q => [q.answer, q]));

        // Step 2: Prepare bulk operations
        const bulkOps = [];
        const fetchPromises = [];

        for (const item of items) {
            const existingQuestion = existingMap.get(item.name);
            let questionId;

            if (existingQuestion) {
                // Update existing question
                bulkOps.push({
                    updateOne: {
                        filter: { _id: existingQuestion._id },
                        update: { $set: { subject: code, answer: item.name }, $inc: { __v: 1 } }
                    }
                });
                questionId = existingQuestion._id;
            } else {
                // Insert new question
                const newQuestion = new Question({ subject: code, answer: item.name });
                bulkOps.push({ insertOne: { document: newQuestion } });
                questionId = newQuestion._id;
            }

            // Fetch and save image in parallel
            fetchPromises.push(
                fetch(item.image)
                    .then(res => res.arrayBuffer())
                    .then(buffer => fs.promises.writeFile(`${imagesDir}/${questionId}.jpg`, Buffer.from(buffer)))
                    .catch(err => console.error(`Error saving image for ${item.name}:`, err))
            );
        }

        // Step 3: Execute bulk database operations
        if (bulkOps.length > 0) {
            await Question.bulkWrite(bulkOps);
        }

        // Step 4: Wait for all images to be downloaded and saved
        await Promise.all(fetchPromises);

        console.log('Data and images saved successfully.');
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

module.exports = router;