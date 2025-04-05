import CreateIcon from '@mui/icons-material/Create';
import GroupAddIcon from '@mui/icons-material/Search';
import React, { useState, useEffect } from "react";
import {getAuthToken, getCurrentUserId} from "@/utils/auth";
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
    TableRow,
    TableCell
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
    const [loggedUserGroup, setLoggedUserGroup] = useState(null);
    const [groupMembers, setGroupMembers] = useState([]);
    const [user, setUser] = useState(null);

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

    const updateGroupMembers = async () => {
        try {            
            const response = await axios.post(
                `${apiEndpoint}/users/by-ids`,
                {users: loggedUserGroup.members},
                {
                    headers: {
                    "Content-Type": "application/json",
                    },
                }
            );
            
            setGroupMembers(response.data);
            
        } catch (error) {
            console.error("Error fetching group members:", error);
        }
    };

    const getUsernameById = (id) => {
        const user = groupMembers.find((u) => u._id === id);
        return user ? user.username : null;
    };

    const searchGroup = async (name) => {
        setGroupName(name);
        try {
            const response = await axios.get(`${apiEndpoint}/groups/${name}`);
            if (!response.data) {
                setDoesGroupExist(false);
            } else {
                setDoesGroupExist(true);
            }
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
        const saveUserId = async () => {
            const currentUserId = await getCurrentUserId(getAuthToken());
            setUser(currentUserId);
        }
        saveUserId();
    }, []);

    useEffect(() => {
        if (loggedUserGroup) {
            updateGroupMembers();
        }
    }, [loggedUserGroup]);

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
                    </Typography>

                    {loggedUserGroup.owner === user && (
                        <Typography variant="h6" className="group-name">
                            Owner: {getUsernameById(loggedUserGroup.owner)} (You)   
                        </Typography>
                    )}

                    {loggedUserGroup.owner !== user &&(
                        <Typography variant="h6" className="group-name">
                            Owner: {getUsernameById(loggedUserGroup.owner)}
                        </Typography>
                    )}
                    
                </Box>

                <Box className="group-members">
                    <Typography variant="subtitle1" className="group-members-title">
                        Members:
                    </Typography>
                    {groupMembers.map((entry, index) => {
                        const isCurrentUser =
                            user && (user === entry._id || (typeof user === "object" && user._id === entry._id));

                        return (
                            <TableRow
                                key={entry._id}
                                className={isCurrentUser ? "current-user" : ""}
                                sx={{
                                    backgroundColor: isCurrentUser ? "rgba(144, 202, 249, 0.2)" : "inherit",
                                    "&:hover": {
                                        backgroundColor: isCurrentUser
                                            ? "rgba(144, 202, 249, 0.3)"
                                            : "rgba(0, 0, 0, 0.04)",
                                    },
                                }}
                            >
                                <TableCell>#{index + 1}</TableCell>
                                <TableCell>
                                    {isCurrentUser ? (
                                        <Typography component="span" fontWeight="bold">
                                            {entry.username} (You)
                                        </Typography>
                                    ) : (
                                        entry.username
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                        })
                    }

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