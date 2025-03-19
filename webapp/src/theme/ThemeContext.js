import PropTypes from "prop-types";
import { useState, useMemo, createContext, useContext } from "react";
import { ThemeProvider as MuiThemeProvider, createTheme } from "@mui/material/styles";

// Crear el contexto
const ThemeContext = createContext();

// Proveedor del tema
const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  // Crear el tema usando useMemo para que no se recree en cada renderizado
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? "dark" : "light",
          primary: {
            main: "#1976d2",
          },
          secondary: {
            main: "#dc004e",
          },
        },
      }),
    [darkMode] // Dependencia en darkMode para recrear el tema cuando cambie
  );

  const contextValue = useMemo(
    () => ({ darkMode, toggleDarkMode }), // Se pasa el estado y función para cambiarlo al contexto
    [darkMode, toggleDarkMode]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

// Hook para acceder al contexto de tema
export const useTheme = () => useContext(ThemeContext);

// Validación de las propiedades de ThemeProvider
ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ThemeProvider;
