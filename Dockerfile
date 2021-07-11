# build environment
FROM node:12.13.0 as builder

RUN mkdir -p /usr/omniboard
WORKDIR /usr/omniboard
ENV PATH=/usr/omniboard/node_modules/.bin:$PATH GENERATE_SOURCEMAP=false

# install yarn
RUN npm install -g yarn

COPY . /usr/omniboard

RUN yarn run prepublishOnly

EXPOSE 9000

FROM node:12-alpine

WORKDIR /usr/omniboard
RUN apk add --no-cache tini

# Having "--" at the end will enable passing command line args to npm script
ENTRYPOINT ["/sbin/tini", "--", "yarn", "run", "prod"]

ENV PATH /usr/omniboard/node_modules/.bin:$PATH

COPY --from=builder /usr/omniboard/package.json /usr/omniboard/package.json
COPY --from=builder /usr/omniboard/dist /usr/omniboard/dist
COPY --from=builder /usr/omniboard/web/build /usr/omniboard/web/build
RUN yarn install --production && yarn cache clean --force
