const express = require('express');
const router = express.Router();
const Question = require('../../question-model');
const fs = require('fs');
const QuizModel = require('../../quizz-model');

const wikiDataUri = "https://query.wikidata.org/sparql?format=json&query=";

function isWikimediaError(text) {
    return text.includes('<!DOCTYPE html>') &&
        text.includes('Wikimedia Error') &&
        text.includes('Too Many Requests');
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url, options = {}, maxRetries = 3, baseDelay = 2000) {
    let retries = 0;

    while (retries <= maxRetries) {
        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                if (response.status === 429) {
                    const waitTime = baseDelay * Math.pow(2, retries);
                    console.log(`Límite de velocidad (429). Reintentando en ${waitTime/1000}s...`);
                    await delay(waitTime);
                    retries++;
                    continue;
                }
                throw new Error(`Error HTTP ${response.status}`);
            }

            // Para solicitudes de imagen
            if (url !== wikiDataUri + encodeURIComponent(options.query) &&
                response.headers.get('content-type')?.startsWith('image/')) {
                return response;
            }

            // Para solicitudes de datos (JSON)
            const text = await response.text();
            if (isWikimediaError(text)) {
                const waitTime = baseDelay * Math.pow(2, retries);
                console.log(`Recibido error HTML. Reintentando en ${waitTime/1000}s...`);
                await delay(waitTime);
                retries++;
                continue;
            }

            return JSON.parse(text);
        } catch (error) {
            const waitTime = baseDelay * Math.pow(2, retries);
            console.log(`Error: ${error.message}. Reintentando en ${waitTime/1000}s...`);
            await delay(waitTime);
            retries++;

            if (retries > maxRetries) {
                throw error;
            }
        }
    }
}

async function processInBatches(items, processFn, concurrency = 2) {
    const results = [];
    for (let i = 0; i < items.length; i += concurrency) {
        const batch = items.slice(i, i + concurrency);
        const batchResults = await Promise.all(batch.map(processFn));
        results.push(...batchResults);

        if (i + concurrency < items.length) {
            await delay(1000);
        }
    }
    return results;
}

async function saveQuestionsToDB(code, query) {
    const url = wikiDataUri + encodeURIComponent(query);

    try {
        const data = await fetchWithRetry(url, {
            headers: {
                'User-Agent': 'wichat_en2b/1.0'
            },
            query: query
        });

        const items = data.results.bindings.filter(item => {
            const itemId = item.item.value.split('/').pop();
            return item.itemLabel.value != null && item.image.value != null
                && !/^Q\d+$/.test(item.itemLabel.value) && itemId != item.itemLabel.value;
        }).map(item => ({
            name: item.itemLabel.value,
            image: item.image.value
        }));

        if (items.length === 0) {
            throw new Error('No items were found for the provided query');
        }

        const imagesDir = './public/images';
        await fs.promises.mkdir(imagesDir, { recursive: true });

        const existingQuestions = await Question.find({ subject: code }).lean();
        const existingMap = new Map(existingQuestions.map(q => [q.answer, q]));

        const bulkOps = [];
        const imageDownloadTasks = [];

        for (const item of items) {
            const existingQuestion = existingMap.get(item.name);
            let questionId;

            if (existingQuestion) {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: existingQuestion._id },
                        update: {
                            $set: {
                                subject: code,
                                answer: item.name
                            },
                            $inc: { __v: 1 },
                            $setOnInsert: { ext: existingQuestion.ext }
                        }
                    }
                });
                questionId = existingQuestion._id;
            } else {
                const newQuestion = new Question({
                    subject: code,
                    answer: item.name,
                    ext: ''
                });
                bulkOps.push({ insertOne: { document: newQuestion } });
                questionId = newQuestion._id;
            }

            imageDownloadTasks.push(async () => {
                try {
                    const res = await fetchWithRetry(item.image);
                    let ext = 'jpg';

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

                    const buffer = await res.arrayBuffer();
                    await fs.promises.writeFile(
                        `${imagesDir}/${questionId}.${ext}`,
                        Buffer.from(buffer)
                    );

                    await Question.updateOne(
                        { _id: questionId },
                        { $set: { ext: ext } }
                    );
                } catch (err) {
                    console.error(`Error al guardar imagen para "${item.name}":`, err);
                }
            });
        }

        if (bulkOps.length > 0) {
            await Question.bulkWrite(bulkOps);
        }

        await processInBatches(imageDownloadTasks, task => task(), 2);

        console.log('Datos e imágenes guardados correctamente.');
        return items;
    } catch (error) {
        console.error('Error al guardar datos:', error);
        throw error;
    }
}

module.exports = saveQuestionsToDB;