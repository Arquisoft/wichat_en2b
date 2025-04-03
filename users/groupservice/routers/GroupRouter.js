const express = require('express');
const router = express.Router();
const Group = require('../group-model.js');
const User = require('../../userservice/user-model.js');
const verifyToken = require('../../../gameservice/routers/middleware/auth');

function leaveGroup(user) {
    if (user.userGroup !== null) {
        user.userGroup = null;
        user.__v += 1;
        return user.save();
    }
}

function deleteGroup(group) {
    const group = Group.findOneAndDelete({ name: group });
    return group;
}

// Get all groups
router.get('/groups', async (req, res) => {
    try {
        res.status(200).send(await Group.find());
    } catch (error) {
        res.status(500).send(error);
    }
});

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

// Update a group by its name
router.patch('/groups/:name', async (req, res) => {
    if (Object.keys(req.body).length === 0) {
        return res.status(400).
            json({ error: 'Request body is required' });
    }

    try {
        const group = await Group.findOne({name : req.params.name.toString() });
        if (!group) {
            return res.status(404).send();
        }

        if (req.body.name && req.body.name !== req.params.name){
            const existingGroup = await Group.findOne({ name: req.body.name.toString() });
            if (existingGroup) {
                return res.status(400).json({ error: 'Group already exists' });
            }
        }
        group.name = req.body.name;
        group.__v += 1;

        await group.save();
        res.status(200).send(group);

    }catch(error){
        res.status(500).send(error);
    }
});

// Delete a group by its name
router.delete('/groups/:name', async (req, res) => {
    try {
        const group = await deleteGroup(req.params.name.toString());
        if (!group) {
            return res.status(404).send();
        }

        const users = await User.find({ userGroup: group.name });
        for (const user of users) {
            await leaveGroup(user);
        }

        res.status(200).send(group);
    } catch (error) {
        res.status(500).send(error);
    }
});

// Add a user to a group
router.post('/groups/join/:name', verifyToken, async (req, res) => {
    try {
        const group = await Group.findOne({ name: req.params.name.toString() });
        if (!group) {
            return res.status(404).send();
        }

        const foundUser = User.findOne({username: req.user.username.toString()});
        if (!foundUser) {
            return res.status(404).send();
        }
        if (foundUser.userGroup !== null) {
            return res.status(400).json({ error: 'User already belongs to a group' });
        }
        
        
        res.status(200).send(group);
    } catch (error) {
        res.status(500).send(error);
    }
});

router.post('/groups/leave', verifyToken, async (req, res) => {
    try {
        //Look for the logged in user
        const foundUser = await User.findOne({ username: req.user.username.toString() });
        if (!foundUser) {
            return res.status(404).json({ error: 'User not found'});
        }
        //Check if the user belongs to a group
        if (foundUser.userGroup === null) {
            return res.status(400).json({ error: 'User does not belong to a group' });
        }

        //Check if the group exists and save it
        const previousGroup = Group.findOne({ name: foundUser.userGroup });
        if (!previousGroup) {
            return res.status(404).json({ error: 'User belongs to a non existing group' });
        }

        //Remove the user from the group
        await leaveGroup(foundUser);

        //Check if the left user was the owner of the group
        //If so, find a new owner and assign it to the group
        //If no new owner is found then the group is empty -> delete the group
        if (previousGroup.owner === foundUser.username) {
            const newOwner = User.findOne({ userGroup: previousGroup.name });
            if (newOwner) {
                previousGroup.owner = newOwner.username;
                await newOwner.save();
            } else {
                deleteGroup(previousGroup);
            }
        }
        
        res.status(200).send(foundUser);
    } catch (error) {
        res.status(500).send(error);
    }
});

module.exports = router;