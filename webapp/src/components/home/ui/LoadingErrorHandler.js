import React from 'react';
import PropTypes from 'prop-types';
import { CircularProgress, Typography, Card, CardContent } from "@mui/material";

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
                    <Typography color="error">{error}</Typography>
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
