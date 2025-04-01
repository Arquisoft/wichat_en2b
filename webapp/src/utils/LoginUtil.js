export const loginUser = async (username, password, apiEndpoint, token) => {
    const response = await fetch(`${apiEndpoint}/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
            user: { username, password },
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw data;
    }

    return data;
};
