# Use an official Node.js runtime as a parent image
FROM node:23

# Set the working directory in the container
WORKDIR /usr/src/wihoot

COPY package*.json ./
RUN npm install

COPY . .

# Expose the port the app runs on
EXPOSE 8006

# Define the command to run your app
CMD ["node", "./wihoot.js"]
