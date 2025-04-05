import CreateIcon from '@mui/icons-material/Create';
import GroupAddIcon from '@mui/icons-material/Search';
import React, { useState, useEffect } from "react";
import axios from "axios";
import "../../../styles/home/GroupPage.css"; 
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
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
    const [loggedUserGroup, setLoggedUserGroup] = useState([]);
    
    const updateUserGroup = async () => {
        try {
            const token = document.cookie
            .split("; ")
            .find((row) => row.startsWith("token="))
            ?.split("=")[1];

            const response = await axios.get(
                `${apiEndpoint}/groups/joined`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                }
              );
            console.log("Response from user group:", response);
            setLoggedUserGroup(response.data);
        } catch (error) {
            if (error.response && error.response.status === 404) {
                setLoggedUserGroup(null);
                console.error("User group not found:", error);
            }else {
                console.error("Error fetching user group:", error);
            }

        }
    };

    const searchGroup = async (name) => {
        setGroupName(name);
        try {
            const response = await axios.get(`${apiEndpoint}/groups/${name}`);
            console.log("Response from group search:", response);
            setDoesGroupExist(true);
        } catch (error) {
            if (error.response && error.response.status === 404) {
                setDoesGroupExist(false);
            } else {
                console.error("Error searching for groups:", error);
            }
        }
    };

    const createGroup = async () => {
        try {
            const token = document.cookie
            .split("; ")
            .find((row) => row.startsWith("token="))
            ?.split("=")[1];

            const response = await axios.post(
                `${apiEndpoint}/groups`,
                { name: groupName },
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                }
              );
            console.log("Response from group creation:", response);
        } catch (error) {
            console.error("Error creating group:", error);
        }
    };

    const joinGroup = async () => {
        try {
            const token = document.cookie
            .split("; ")
            .find((row) => row.startsWith("token="))
            ?.split("=")[1];

            const response = await axios.post(
                `${apiEndpoint}/groups/join`,
                { name: groupName },
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                }
              );
            console.log("Response from group join:", response);
        } catch (error) {
            console.error("Error joining group:", error);
        }
    }

    const leaveGroup = async () => {
        try {
            const token = document.cookie
            .split("; ")
            .find((row) => row.startsWith("token="))
            ?.split("=")[1];

            const response = await axios.post(
                `${apiEndpoint}/groups/leave`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                }
              );
            console.log("Response from group leave:", response);
        } catch (error) {
            console.error("Error leaving group:", error);
        }
    }

    useEffect(() => {
        updateUserGroup();
    }, []);

    if (!loggedUserGroup){
        return (
            <Card className="group-container">
                <CardContent>

                    <Box className="group-header">
                        <Typography variant="h5" className="group-title">
                            You are not part of any group!
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
                                onChange={e => searchGroup(e.target.value)}
                            />
                            {!doesGroupExist && <p className="error-message">Group does not exist</p>}
                            <Button variant="contained" color="primary" onClick={joinGroup}>
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
                                onChange={e => searchGroup(e.target.value)}
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
    }

    return (
        <Card className="group-container">
            <CardContent>

                <Box className="group-header">
                    <Typography variant="h5" className="group-title">
                        Your group
                    </Typography>
                </Box>

                <Box className="group-info">
                    <Typography variant="h6" className="group-name">
                        Name: {loggedUserGroup.groupName}
                        Owner: {loggedUserGroup.owner}
                    </Typography>
                </Box>

                <Box className="group-members">
                    <Typography variant="subtitle1" className="group-members-title">
                        Members:
                    </Typography>
                    <ul>
                        {loggedUserGroup.members.forEach(element => {
                            <li>{element}</li>
                        })}
                    </ul>
                </Box>

                <Box className="group-leave">
                    <Button variant="contained" color="secondary" onClick={leaveGroup}>
                        Leave Group
                    </Button>
                </Box>
            </CardContent>
        </Card>
    )

};