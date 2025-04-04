const express = require('express');
const router = express.Router();
const Group = require('../group-model.js');
const verifyToken = require('../../../gameservice/routers/middleware/auth');


const joinGroup = async (userId, group) => {
    if (!group.members.includes(userId.toString())) {
        group.members.push(userId);
        await group.save();
    }
    return group;
};


const deleteGroup = async (groupId) => {
    const deletedGroup = await Group.findByIdAndDelete(groupId);
    return deletedGroup;
}

// Get all groups
router.get('/groups', async (req, res) => {
    try {
        res.status(200).send(await Group.find());
    } catch (error) {
        res.status(500).send(error);
    }
});

router.get('/groups/joined', verifyToken, async (req, res) => {
    try {
        // Get the user that is logged in
        const userId = req.user._id;

        // Get the group that the user belongs to
        const group = await UserGroup.find({ members: userId });

        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        res.status(200).send(group);
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

// Create a new group
router.post('/groups', verifyToken, async (req, res) => {
    try {
        // Check if the request body is empty
        if (Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: 'Request body is required' });
        }
        // Check if the group name is provided
        if (!req.body.name) {
            return res.status(400).json({ error: 'Group name is required' });
        }

        // Check if the group name already exists   
        const existingGroup = await Group.findOne({ name: req.body.name.toString() });

        if (existingGroup) {
            return res.status(400).json({ error: 'Group already exists' });
        }
        
        // Create the group
        const group = new Group({
            ...req.body
        });
        // Validate the group
        const errors = group.validateSync();

        // If there are validation errors, send them in the response
        if (errors) {
            console.log(errors);
            return res.status(400).send(errors);
        }

        // Get the user that is creating the group
        const userId = req.user._id;
        if (!userId) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if the user already belongs to a group
        // If the user already belongs to a group, return an error
        const belongingGroup = await UserGroup.findOne({ members: userId });
        if (belongingGroup) {
            return res.status(400).json({ error: 'User already belongs to a group' });
        }

        joinGroup(userId, group);

        // Set the group owner to the user that created it
        group.owner = userId;

        await group.save();

        res.status(201).send(group);
    } catch (error) {
        res.status(500).send(error);
    }
});

// Update a group by its name
router.patch('/groups', verifyToken, async (req, res) => {
    const { id, name } = req.body;

    if (!id || !name) {
        return res.status(400).json({ error: 'Both id and new group name are required' });
    }

    try {
        const group = await Group.findById(id);
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        if (group.name === name) {
            return res.status(400).json({ error: 'New name must be different from the current one' });
        }

        const existingGroup = await Group.findOne({ name });
        if (existingGroup) {
            return res.status(400).json({ error: 'Group name already exists' });
        }

        group.name = name;
        await group.save();

        res.status(200).json(group);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});


// Delete a group by its name
router.delete('/groups', verifyToken, async (req, res) => {
    const { groupId } = req.body;

    if (!groupId) {
        return res.status(400).json({ error: 'Both id and new group name are required' });
    }

    try {
        const userId = req.user._id;
        if (!userId) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Check if the user is the owner of the group
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        if (group.owner !== userId) {
            return res.status(403).json({ error: 'Only the owner can delete the group' });
        }
        // Delete the group if it exists
        const deleted = await deleteGroup(groupId);
        if (!deleted) {
            return res.status(500).json({ error: 'Error deleting group' });
        }

        res.status(200).json({ message: 'Group deleted successfully', group: deleted });

    } catch (error) {
        res.status(500).send(error);
    }
});

// A user joins a group
router.post('/groups/join/:name', verifyToken, async (req, res) => {
    try {
        // Get the group by its name
        // Check if the group name is provided
        const group = await Group.findOne({ name: req.params.name.toString().trim() });
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        // Find the user wanting to join the group
        const userId = req.user._id;
        
        // Check if the user already belongs to a group
        const belongingGroup = await Group.findOne({ members: userId });
        if (belongingGroup) {
            return res.status(400).json({ error: 'User already belongs to a group' });
        }

        const updatedGroup = await joinGroup(userId, group._id);

        res.status(200).json({ message: 'Joined group successfully', group: updatedGroup });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

router.post('/groups/leave', verifyToken, async (req, res) => {
    try {
        // Look for the logged-in user
        const userId = req.user._id;

        // Check if the user belongs to a group
        const group = await Group.findOne({ members: userId });
        if (!group) {
            return res.status(400).json({ error: 'User does not belong to any group' });
        }

        // Remove the user from the group
        group.members.pull(userId); // mejor usar `pull` que `remove`
        await group.save();
        
        // Check if the left user was the owner of the group
        if (group.owner === userId) {
            const members = group.members;
            if (members.length > 0) {
                // Assign a new owner from the remaining members
                group.owner = members[members.length - 1]; // Assign the last member as the new owner
                await group.save();
            } else {
                // If no members left, delete the group
                await deleteGroup(group._id);
                return res.status(200).json({ message: 'Group deleted because it had no members' });
            }
        }

        // Respond with the updated group
        res.status(200).json({ message: 'Left the group successfully', group });

    } catch (error) {
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});


module.exports = router;