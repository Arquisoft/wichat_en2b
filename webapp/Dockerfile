# Usa la imagen oficial de Node.js
FROM node:22

# Copia los archivos del proyecto en el contenedor
COPY . /app
WORKDIR /app

# Instala las dependencias
RUN npm install

# Configura las variables de entorno
ARG API_URI="http://localhost:8000"
ENV REACT_APP_API_ENDPOINT=$API_URI

# Crea una versión optimizada de la aplicación
RUN npm run build

# Expón el puerto en el que Next.js servirá la aplicación
EXPOSE 3000

# Inicia el servidor de producción de Next.js
CMD ["npm", "run", "start"]
