import React from 'react';
import PropTypes from 'prop-types';
import { CircularProgress, Card, CardContent, Alert } from "@mui/material";

export default function LoadingErrorHandler({ loading, error, children }) {
    if (loading) {
        return (
            <Card>
                <CardContent style={{ display: "flex", justifyContent: "center" }}>
                    <CircularProgress />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardContent>
                    <Alert severity="info" className="group-alert">
                    {error}
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return children;
}

LoadingErrorHandler.propTypes = {
    loading: PropTypes.bool.isRequired,  
    error: PropTypes.string,             
    children: PropTypes.node.isRequired, 
};
