# Use an official Node.js runtime as a parent image
FROM node:23

# Set the working directory in the container
WORKDIR /usr/src/userservice

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

ARG JWT_SECRET
ENV JWT_SECRET=${JWT_SECRET}

# Install app dependencies
RUN npm install
RUN mkdir -p /usr/src/userservice/public/images

# Copy the app source code to the working directory
COPY . .

# Expose the port the app runs on
EXPOSE 8001

# Define the command to run your app
CMD ["node", "user-service.js"]
