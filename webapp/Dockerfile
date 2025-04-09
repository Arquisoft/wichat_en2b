# Usa la imagen oficial de Node.js
FROM node:23

# Copia los archivos del proyecto en el contenedor
COPY . /app
WORKDIR /app

ARG NEXT_PUBLIC_GATEWAY_SERVICE_URL
ENV NEXT_PUBLIC_GATEWAY_SERVICE_URL=${NEXT_PUBLIC_GATEWAY_SERVICE_URL}

# Instala las dependencias y crea una versión optimizada de la aplicación
RUN npm install && npm run build

# Expón el puerto en el que Next.js servirá la aplicación
EXPOSE 3000

# Inicia el servidor de producción de Next.js
CMD ["npm", "run", "start"]
