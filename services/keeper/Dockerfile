FROM node:20-alpine

WORKDIR /app

# Install deps first (layer cache)
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts

# Install devDependencies for build step
RUN npm install --ignore-scripts

# Copy source and compile
COPY tsconfig.json index.ts ./
RUN npm run build

# Remove devDependencies for final image
RUN npm prune --omit=dev

EXPOSE 3001

CMD ["node", "dist/index.js"]
