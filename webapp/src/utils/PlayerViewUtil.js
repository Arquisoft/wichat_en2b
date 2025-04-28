
export const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || "http://localhost:8000";

export const getToken = () => {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith("token="))
    ?.split("=")[1];
};

export const fetchJson = async (url, options = {}) => {
  try {
    const response = await fetch(`${apiEndpoint}${url}`, {
      headers: { "Content-Type": "application/json", ...options.headers },
      ...options,
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}`);
    }
    return await response.json();
  } catch (err) {
    throw err;
  }
};

export const saveGameData = async (token, gameData) => {
  try {
    const response = await fetch(`${apiEndpoint}/game`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(gameData),
    });
    if (!response.ok) {
      throw new Error("Failed to save game data");
    }
    console.log("Game data saved successfully");
  } catch (err) {
    console.error("Error saving game data:", err);
  }
};