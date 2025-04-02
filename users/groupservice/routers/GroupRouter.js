const express = require('express');
const router = express.Router();
const Group = require('../group-model.js');

// Create a new group
router.post('/groups', async (req, res) => {
    try {
        const group = new Group({
            ...req.body
        });
        const errors = group.validateSync();

        if (errors) {
            console.log(errors);
            return res.status(400).send(errors);
        }

        const existingGroup = await Group.findOne({ name: req.body.name.toString() });

        if (existingGroup) {
            return res.status(400).json({ error: 'Group already exists' });
        }
        await group.save();

        res.status(201).send(group);
    } catch (error) {
        res.status(500).send(error);
    }
});

// Get all groups
router.get('/groups', async (req, res) => {
    try {
        res.status(200).send(await Group.find());
    } catch (error) {
        res.status(500).send(error);
    }
});

// Get a group by its name
router.get('/groups/:name', async (req, res) => {
    try {
        const group = await Group.findOne({ name: req.params.name.toString() });
        if (!group) {
            return res.status(404).send();
        }
        res.status(200).send(group);
    } catch (error) {
        res.status(500).send(error);
    }
});


// Delete a group by its name
router.delete('/groups/:name', async (req, res) => {
    try {
        const group = await Group.findOneAndDelete({name: req.params.name.toString() });
        if (!group) {
            return res.status(404).send();
        }
        res.status(200).send(group);
    } catch (error) {
        res.status(500).send(error);
    }
});

module.exports = router;