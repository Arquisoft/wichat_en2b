export const getAuthToken = () => {
    return document.cookie
        .split("; ")
        .find((row) => row.startsWith("token="))
        ?.split("=")[1];
};

export const getCurrentPlayerId = (token) => {
    try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        return decoded.username;
    } catch (error) {
        console.error('Error getting current player ID:', error);
        return null;
    }
};

export const getCurrentUserId = (token) => {
    try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        return decoded._id;
    } catch (error) {
        console.error('Error getting current player ID:', error);
        return null;
    }
};