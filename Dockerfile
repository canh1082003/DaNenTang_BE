# Stage 1: install dependencies
FROM node:16-alpine As development

# Set working directory
WORKDIR /usr/src/app
# Install and cache app dependencies development
COPY --chown=node:node package.json ./
COPY --chown=node:node yarn.lock ./

# Install yarn
RUN yarn install

# Copy existing application directory contents
COPY --chown=node:node . .

USER node


# Stage 2: build
FROM node:16-alpine As build

# Set working directory
WORKDIR /usr/src/app

# Install and cache app dependencies production
COPY --chown=node:node package.json ./
COPY --chown=node:node yarn.lock ./

# Use node_modules at development to build dist folder
COPY --chown=node:node --from=development /usr/src/app/node_modules ./node_modules

# Copy existing application directory contents
COPY --chown=node:node . .

ENV NODE_ENV production

# Build source
RUN yarn build

# Install production and clear cache app dependencies
RUN yarn install  --production && yarn cache clean

USER node


# Stage 3: run
FROM node:16-alpine As production

COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/package.json ./package.json
COPY --chown=node:node --from=build /usr/src/app/dist ./dist

# Start run in production environment
CMD [ "yarn", "run", "start-all" ]

EXPOSE 4000