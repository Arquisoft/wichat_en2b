import CreateIcon from '@mui/icons-material/Create';
import GroupAddIcon from '@mui/icons-material/Search';
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import "../../../styles/home/GroupPage.css"; 
import {
    Box,
    Card,
    CardContent,
    CardHeader,
    Typography,
    Button,
    Avatar,
    Tabs,
    TextField,
    Tab,
    Snackbar,
} from "@mui/material";

const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || 'http://localhost:8000';

/**
 * 
 * @param {String} username
 *  
 * @returns {JSX.Element} 
 */
export default function GroupPage({ username }) {
    if (!username) {
        throw new Error("Invalid props for ProfileForm component.");
    }

    const [tabIndex, setTabIndex] = useState(0);
    const [groupName, setGroupName] = useState("");
    const [doesGroupExist, setDoesGroupExist] = useState(false);

    const searchGroup = async () => {
        try {
            const response = await get(`${apiEndpoint}/groups/${groupName}`);
            console.log("Response from group search:", response);
        } catch (error) {
            console.error("Error searching for groups:", error);
        }
    };

    const createGroup = async () => {
        try {
            const response = await post(`${apiEndpoint}/groups`, { groupName });
            console.log("Response from group creation:", response);
        } catch (error) {
            console.error("Error creating group:", error);
        }
    };

    return (
        <Card className="group-container">
            <CardContent>

                <Box className="group-header">
                    <Typography variant="h5" className="group-title">
                        Groups
                    </Typography>
                </Box>

                {/* Tabs */}
                <div className="tabs-container">
                    <Tabs 
                        value={tabIndex} 
                        onChange={(e, newValue) => setTabIndex(newValue)} 
                        scrollButtons="auto"
                        variant="scrollable"
                        className={"tabs-header"}
                    >
                        <Tab label="Join" icon={<GroupAddIcon />} />
                        <Tab label="Create" icon={<CreateIcon />} />
                    </Tabs>
                </div>

                {/* Group add tab */}
                {tabIndex === 0 && (
                    <Box className="group-add-tab">
                        <TextField
                            label="Group Name"
                            variant="outlined"
                            fullWidth
                            onChange={e => {setGroupName(e.target.value); searchGroup()}}
                        />
                        {!doesGroupExist && <p className="error-message">Group does not exist</p>}
                        <Button variant="contained" color="primary">
                            Join Group
                        </Button>
                    </Box>
                )}

                {/* Group create tab */}
                {tabIndex === 1 && (
                    <Box className="group-create-tab">
                        <TextField
                            label="Group Name"
                            variant="outlined"
                            fullWidth
                            onChange={e => {setGroupName(e.target.value); searchGroup()}}
                        />
                        {doesGroupExist && <p className="error-message">Group already exists</p>}
                        <Button variant="contained" color="primary" onClick={createGroup}>
                            Create Group
                        </Button>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};