# Build stage for development
FROM node:20-alpine AS development

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Expose the port the app runs on
EXPOSE 3001

# Start the application in development mode
CMD ["npm", "run", "start:dev"]

# Build stage for production
FROM node:20-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./

# Copy node_modules from development stage
COPY --from=development /usr/src/app/node_modules ./node_modules

COPY . .

# Generate Prisma client and build the app
RUN npx prisma generate
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Production stage
FROM node:20-alpine AS production

WORKDIR /usr/src/app

# Copy only the necessary files from the build stage
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/prisma ./prisma

# Expose the application port
EXPOSE 3001

# Start the application in production mode
CMD ["npm", "run", "start:prod"]
