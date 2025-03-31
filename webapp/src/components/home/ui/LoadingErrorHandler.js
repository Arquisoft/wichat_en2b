import { CircularProgress, Typography, Card, CardContent } from "@mui/material";

export default function LoadingErrorHandler({ loading, error, children }) {
    if (loading) {
        return (
            <Card>
                <CardContent style={{ display: "flex", justifyContent: "center" }}>
                    <CircularProgress/>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardContent>
                    <Typography color="error">{error}</Typography>
                </CardContent>
            </Card>
        );
    }

    return children;
}