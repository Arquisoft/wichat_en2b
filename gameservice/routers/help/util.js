const express = require('express');
const router = express.Router();
const Question = require('../../question-model');
const fs = require('fs');
const QuizModel = require('../../quizz-model');

const wikiDataUri = "https://query.wikidata.org/sparql?format=json&query=";
async function saveQuestionsToDB(code, query) {
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
                // Update existing question, also set the 'ext' field in case it wasn't saved before
                bulkOps.push({
                    updateOne: {
                        filter: { _id: existingQuestion._id },
                        update: { 
                            $set: { 
                                subject: code, 
                                answer: item.name 
                            }, 
                            $inc: { __v: 1 },
                            $setOnInsert: { ext: existingQuestion.ext } // Preserve the 'ext' if not updated
                        }
                    }
                });
                questionId = existingQuestion._id;
            } else {
                // Insert new question with extension placeholder
                const newQuestion = new Question({ 
                    subject: code, 
                    answer: item.name,
                    ext: ''  // Initially set empty until the extension is determined
                });
                bulkOps.push({ insertOne: { document: newQuestion } });
                questionId = newQuestion._id;
            }

            // Fetch and save image in parallel
            fetchPromises.push(
                fetch(item.image)
                    .then(async res => {
                        let ext = 'jpg';

                        // Method 1: Try to get extension from content-type header
                        const contentType = res.headers.get('content-type');
                        if (contentType) {
                            const mimeToExt = {
                                'image/jpeg': 'jpg',
                                'image/png': 'png',
                                'image/webp': 'webp',
                                'image/svg+xml': 'svg',
                            };
                            if (mimeToExt[contentType]) {
                                ext = mimeToExt[contentType];
                            }
                        }

                        // Method 2: Try to extract extension from URL if Method 1 failed
                        if (ext === 'jpg') { // If still using default
                            const urlPath = new URL(item.image).pathname;
                            const urlExt = urlPath.split('.').pop().toLowerCase();
                            if (['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(urlExt)) {
                                ext = urlExt === 'jpeg' ? 'jpg' : urlExt;
                            }
                        }

                        // Save the image file with the correct extension
                        console.log(questionId + "." + ext);
                        const buffer = await res.arrayBuffer();
                        await fs.promises.writeFile(
                            `${imagesDir}/${questionId}.${ext}`,
                            Buffer.from(buffer)
                        );

                        // Update the 'ext' field in the database
                        await Question.updateOne(
                            { _id: questionId },
                            { $set: { ext: ext } }  // Set the correct file extension
                        );
                    })
                    .catch(err =>
                        console.error(`Error saving image for "${item.name}" (${item.image}):`, err)
                    )
            );
        }

        // Step 3: Execute bulk database operations
        if (bulkOps.length > 0) {
            await Question.bulkWrite(bulkOps);
        }

        // Step 4: Wait for all images to be downloaded and saved
        await Promise.all(fetchPromises);

        console.log('Data and images saved successfully.');
        console.log(items);
        return items;
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

module.exports = saveQuestionsToDB;