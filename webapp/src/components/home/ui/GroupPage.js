import CreateIcon from '@mui/icons-material/Create';
import GroupAddIcon from '@mui/icons-material/Search';
import React, { useState, useEffect } from "react";
import {getAuthToken, getCurrentPlayerId} from "@/utils/auth";
import { useRouter } from "next/navigation";
import axios from "axios";
import "../../../styles/home/GroupPage.css"; 
import {
    Box,
    Typography,
    Button,
    Tabs,
    TextField,
    Tab,
    Table,
    TableBody,
    TableRow,
    TableCell
} from "@mui/material";

const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || 'http://localhost:8000';

/**
 * 
 *  
 * @returns {JSX.Element} 
 */
export default function GroupPage() {
    const [tabIndex, setTabIndex] = useState(0);
    const [groupName, setGroupName] = useState("");
    const [doesJoinGroupExist, setDoesJoinGroupExist] = useState(true);
    const [doesCreateGroupExist, setDoesCreateGroupExist] = useState(false);
    const [doesNewGroupExist, setDoesNewGroupExist] = useState(false);
    const [loggedUserGroup, setLoggedUserGroup] = useState(null);
    const [groupMembers, setGroupMembers] = useState([]);
    const [user, setUser] = useState(null);
    const [newGroupName, setNewGroupName] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    useRouter();

    const updateEverything = (status) => {
        if (status === 200) {
            updateUserGroup();
            if (loggedUserGroup) {
                updateGroupMembers();
            }
        } 
    };

    const getToken = () => {
        const token = document.cookie
            .split("; ")
            .find((row) => row.startsWith("token="))
            ?.split("=")[1];
        return token;
    };

    const updateUserGroup = async () => {
        try {
            const token = getToken();

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

    const searchJoinGroup = async () => {
        try {
            const data = await abstractSearch(groupName);
            setDoesJoinGroupExist(!!data);
            return !!data; // Devuelve si existe o no
        } catch (error) {
            if (error.response && error.response.status === 204) {
                setDoesJoinGroupExist(false);
                return false;
            } else {
                console.error("Error searching for groups:", error);
                return false;
            }
        }
    };
    
    const searchCreateGroup = async () => {
        try {
            const data = await abstractSearch(groupName);
            setDoesCreateGroupExist(!!data);
            return !!data; // Devuelve si existe o no
        } catch (error) {
            if (error.response && error.response.status === 204) {
                setDoesCreateGroupExist(false);
                return false;
            } else {
                console.error("Error searching for groups:", error);
                return false;
            }
        }
    };

    const searchUpdateGroup = async () => {
        try {
            setErrorMessage("");
            const data = await abstractSearch(newGroupName);
            setDoesNewGroupExist(!!data);
        } catch (error) {
            if (error.response && error.response.status === 204) {
                setDoesNewGroupExist(false);
            } else {
                console.error("Error searching for groups:", error);
            }
        }
    }

    const abstractSearch = async (name) => {
        try {
            const response = await axios.get(`${apiEndpoint}/groups/${name}`);
            return response.data;
        } catch (error) {
            if (error.response && error.response.status === 204) {
                return null; // Grupo no existe
            }
            throw error; // Re-lanza otros errores
        }
    }

    const createGroup = async () => {
        try {
            const token = getToken();

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

            updateEverything(response.status);
        } catch (error) {
            console.error("Error creating group:", error);
        }
    };

    const joinGroup = async () => {
        try {
            const token = getToken();

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

            updateEverything(response.status);
           
        } catch (error) {
            console.error("Error joining group:", error);
        }
    }

    const leaveGroup = async () => {
        try {
            const token = getToken();

            const response = await axios.post(
                `${apiEndpoint}/groups/leave`,
                { },
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                }
            );

            updateEverything(response.status);
        } catch (error) {
            console.error("Error leaving group:", error);
        }
    }


    const deleteGroup = async () => {
        try { 
            const token = getToken();

            const response = await axios.delete(
                `${apiEndpoint}/groups`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                }
            );

            updateEverything(response.status);
        } catch (error) {
            console.error("Error leaving group:", error);
        }
    }

    const modifyGroup = async () => {
        try {
            const token = getToken();
            const response = await axios.patch(
                `${apiEndpoint}/groups`,
                { name: newGroupName },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );
            updateEverything(response.status);
            setNewGroupName(""); // Limpia el campo después de una actualización exitosa
        } catch (error) {
            if (error.response && error.response.data && error.response.data.error) {
                setErrorMessage(error.response.data.error);
            } else {
                setErrorMessage("Error al modificar el grupo");
            }
            console.error("Error modifying group:", error);
        }
    }

    useEffect(() => {
        updateUserGroup();
        const saveUserId = async () => {
            const currentUserId = await getCurrentPlayerId(getAuthToken());
            setUser(currentUserId);
        }
        saveUserId();
    }, []);

    useEffect(() => {
        if (loggedUserGroup) {
            updateGroupMembers();
        }
    }, [loggedUserGroup]);

    useEffect(() => {
        // Limpia los errores y estados al cambiar entre pestañas
        setGroupName("");
        setDoesJoinGroupExist(true);
        setDoesCreateGroupExist(false);
        setErrorMessage("");
    }, [tabIndex]);

    if (!loggedUserGroup){
        return (
            <div className="group-container">

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
                            onChange={e => setGroupName(e.target.value)}
                        />
                        {!doesJoinGroupExist && groupName !== "" && <p className="error-message">Group does not exist</p>}
                        <Button 
                            variant="contained" 
                            color="primary" 
                            onClick={async () => {
                                const exists = await searchJoinGroup();
                                if (exists) {
                                    joinGroup();
                                }
                            }} 
                            disabled={!(groupName.trim() !== "")}
                        >  
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
                            onChange={e => setGroupName(e.target.value)}
                        />
                        {doesCreateGroupExist && groupName.trim() !== "" && <p className="error-message">Group already exists</p>} 
                        <Button 
                            variant="contained" 
                            color="primary" 
                            onClick={async () => {
                                const exists = await searchCreateGroup();
                                if (!exists) {
                                    createGroup();
                                }
                            }}
                            disabled={!(groupName.trim() !== "")}
                        >  
                            Create Group
                        </Button>
                    </Box>
                )}
            </div>
        );
    }

    return (
        <div className="group-container">

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
                {loggedUserGroup.owner === user && (
                    <TextField
                        label="Change group name"
                        variant="outlined"
                        fullWidth
                        onChange={e => setNewGroupName(e.target.value)}
                    />
                )}

                {loggedUserGroup.owner === user && (
                    <Button variant="contained" color="primary" onClick={() =>{
                        searchUpdateGroup();
                        if (!doesNewGroupExist) {
                            modifyGroup();
                        }
                    } 
                    }
                    disabled={
                        !(
                            newGroupName.trim() !== "" &&
                            newGroupName !== loggedUserGroup.groupName
                        )
                    }>
                        Modify group
                    </Button>
                )}
                {loggedUserGroup.owner === user && errorMessage && <p className="error-message">{errorMessage}</p>}

                {loggedUserGroup.owner !== user &&(
                    <Typography variant="h6" className="group-name">
                        Owner: {getUsernameById(loggedUserGroup.owner)}
                    </Typography>
                )}
                
            </Box>

            <div className="group-members">
                <Typography variant="subtitle1" className="group-members-title">
                    Members:
                </Typography>
                
                
                <div className="scrollable-table">
                    <Table>
                        <TableBody>

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
                                ?? null);
                                })
                            }

                        </TableBody>
                    </Table>
                </div>
            </div>

            <Box className="group-controls">
                <Button variant="contained" color="secondary" onClick={leaveGroup} className="leave-button">
                    Leave Group
                </Button>

                {loggedUserGroup.owner === user && (
                    <Button variant="contained" color="error" onClick={deleteGroup}>
                        Delete Group
                    </Button>
                )}
                
            </Box>
        </div>
    )

};