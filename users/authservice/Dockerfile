# Use an official Node.js runtime as a parent image
FROM node:23

# Set the working directory in the container
WORKDIR /usr/src/authservice

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

ARG JWT_SECRET
ENV JWT_SECRET=${JWT_SECRET}

# Install app dependencies
RUN npm install

# Copy the app source code to the working directory
COPY . .

# Expose the port the app runs on
EXPOSE 8002

# Define the command to run your app
CMD ["node", "auth-service.js"]
