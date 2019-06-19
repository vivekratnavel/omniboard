# build environment
FROM node:10.8.0 as builder
RUN mkdir -p /usr/omniboard
WORKDIR /usr/omniboard
ENV PATH /usr/omniboard/node_modules/.bin:$PATH

# grab tini for signal processing and zombie killing
ENV TINI_VERSION v0.18.0
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini
# Having "--" at the end will enable passing command line args to npm script
ENTRYPOINT ["/tini", "--", "yarn", "run", "prod"]

# install yarn
RUN npm install -g yarn

COPY . /usr/omniboard

WORKDIR /usr/omniboard
RUN yarn install

EXPOSE 9000
