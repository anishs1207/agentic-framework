# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the site
RUN npm run build

# Production stage: Serve with Nginx for static site
FROM nginx:alpine

# Copy the build artifacts to the Nginx public directory
COPY --from=builder /app/build /usr/share/nginx/html

# Expose the application port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
