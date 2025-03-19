import React, { useState } from "react";
import PropTypes from "prop-types";
import { Save, Edit, Lock, Security, Person, Smartphone, VerifiedUser } from "@mui/icons-material";
import "../../../styles/ProfilePage.css"; // Importamos el CSS

import {
    Box,
    Card,
    CardContent,
    CardHeader,
    Typography,
    Button,
    Avatar,
    Tabs,
    TextField,
    Tab,
    Snackbar,
} from "@mui/material";

export default function ProfileForm({ onSave }) {
  const [editing, setEditing] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const [openSnackbar, setOpenSnackbar] = useState(false);

  const [profileData, setProfileData] = useState({
    username: "QuizMaster",
    email: "quizmaster@example.com",
    bio: "Quiz enthusiast and knowledge seeker",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    setEditing(false);
    setOpenSnackbar(true);
    onSave(profileData);
  };

  return (
    <Card className="profile-container">
      <CardContent>
        {/* Avatar y Nombre */}
        <Box className="profile-header">
          <Avatar className="profile-avatar">{profileData.username.charAt(0)}</Avatar>
          <Typography variant="h6">{profileData.username}</Typography>
        </Box>

        {/* Tabs */}
        <Tabs value={tabIndex} onChange={(e, newValue) => setTabIndex(newValue)} centered>
          <Tab label="Cuenta" icon={<Person />} />
          <Tab label="Seguridad" icon={<Lock />} />
          <Tab label="2FA" icon={<Security />} />
        </Tabs>

        {/* Contenido de la pestaña "Cuenta" */}
        {tabIndex === 0 && (
          <Box component="form" className="form-section">
            <TextField fullWidth label="Username" 
                name="username" value={profileData.username} 
                onChange={handleChange} disabled={!editing} />
            </Box>
        )}

        {/* Contenido de la pestaña "Seguridad" */}
        {tabIndex === 1 && (
          <Box className="form-section">
            <TextField fullWidth label="Contraseña actual" 
                  name="currentPassword" type="password" 
                  value={profileData.currentPassword} onChange={handleChange} disabled={!editing} />
            <TextField fullWidth label="Nueva contraseña" 
                  name="newPassword" type="password" value={profileData.newPassword} 
                  onChange={handleChange} disabled={!editing} />
            <TextField fullWidth label="Confirmar nueva contraseña" 
                  name="confirmPassword" type="password" value={profileData.confirmPassword} 
                  onChange={handleChange} disabled={!editing} />
          </Box>
        )}

        {/* Contenido de la pestaña "2FA" */}
        {tabIndex === 2 && (
          <Card className="twofa-card">
            <CardHeader title="Autenticación en dos pasos" />
            <CardContent>
              <Typography variant="body1">Agrega una capa extra de seguridad a tu cuenta.</Typography>

              {/* Método: App de autenticación */}
              <Box className="twofa-option">
                <VerifiedUser className="twofa-icon" />
                <Box>
                  <Typography variant="subtitle1">App de autenticación</Typography>
                  <Typography variant="body2" color="text.secondary">
                      Usa Google Authenticator.
                  </Typography>
                </Box>
                <Button variant="contained" color="primary">Configurar</Button>
              </Box>

              {/* Método: SMS */}
              <Box className="twofa-option">
                <Smartphone className="twofa-icon" />
                <Box>
                  <Typography variant="subtitle1">Mensaje de texto</Typography>
                  <Typography variant="body2" color="text.secondary">
                      Recibe códigos por SMS en tu teléfono.
                  </Typography>
                </Box>
                <Button variant="contained" color="primary">Configurar</Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Botón de Guardar/Editar */}
        <Box className="save-button">
          {editing ? (
            <Button variant="contained" startIcon={<Save />} onClick={handleSave}>
              Guardar cambios
            </Button>
          ) : (
            <Button variant="outlined" startIcon={<Edit />} onClick={() => setEditing(true)}>
              Editar perfil
            </Button>
          )}
        </Box>

        {/* Snackbar de confirmación */}
        <Snackbar open={openSnackbar} autoHideDuration={3000} onClose={() => setOpenSnackbar(false)} message="Perfil actualizado correctamente" />
      </CardContent>
    </Card>
  );
}

// Validación de PropTypes
ProfileForm.propTypes = {
  onSave: PropTypes.func.isRequired,
};
