const express = require('express');
const router = express.Router();
const Question = require('../../question-model');
const fs = require('fs');
const QuizModel = require('../../quizz-model');

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
                        const mimeToExt = {
                            'image/jpeg': 'jpg',
                            'image/png': 'png',
                            'image/webp': 'webp',
                            'image/svg+xml': 'svg',
                        };
                        const contentType = res.headers.get('content-type') || 'image/jpeg';
                        const ext = mimeToExt[contentType] || 'jpg'; // fallback to jpg

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
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

module.exports = saveQuestionsToDB;