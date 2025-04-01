import {getAuthToken} from "@/utils/auth";

const gatewayService = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || "http://localhost:8000";

export const fetchWithAuth = async (endpoint) => {
    const token = getAuthToken();
    if (!token) {
        throw new Error('No authentication token found');
    }

    const response = await fetch(`${gatewayService}${endpoint}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch from ${endpoint}`);
    }

    return response.json();
};