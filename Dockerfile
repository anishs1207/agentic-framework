FROM node:22-bullseye-slim AS base

WORKDIR /usr/src/app

COPY package*.json ./

RUN --mount=type=cache,target=/usr/src/app/.npm \
    npm set cache /usr/src/app/.npm && \
    npm install

COPY . .

CMD ["npm", "run", "dev"]

# $ docker build -t anishsabharwal/agent-cli:latest .
# docker run anishsabharwal/agent-cli:latest
# it fails since the it needs rge .env GEMINI key here
# docker run --env-file .env anishsabharwal/agent-cli:latest
# to run in an intractive terminal
# docker run -it --env-file .env anishsabharwal/agent-cli:latest
# it works