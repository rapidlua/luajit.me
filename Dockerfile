#######################################################################
#
# luajit.me.builder
#   provides application (JavaScript server + web assets)
#   prepared for distribution at ${DIST}/usr/src/luajit.me
#
#######################################################################
FROM node:10-alpine AS luajit.me.builder
ARG VERSION

# As of Docker 19.03.5, DOCKER_BUILDKIT=1 and userns_remap enabled,
# if a directory was created during COPY, it won't be writable in RUN.
RUN mkdir -p /root/luajit.me/server/public

# build dependencies are massive (almost 100MiB);
# take advantage of the Docker cache
COPY package.json /root/luajit.me/package.json
RUN cd /root/luajit.me && npm install

# take advantage of the Docker cache (again :)
COPY webpack.config.js /root/luajit.me
COPY client /root/luajit.me/client
COPY server/targets.js /root/luajit.me/server/
RUN cd /root/luajit.me && npm config set unsafe-perm true \
    && VERSION=$VERSION npm install

COPY server /root/luajit.me/server

RUN cd /root/luajit.me && npm pack

RUN mkdir -p /root/dist/usr/src/luajit.me \
    && cd /root/dist/usr/src/luajit.me \
    && tar -xf /root/luajit.me/luajit.me-*.tgz --strip-components 1 \
    && npm install --production

#######################################################################
#
# lua-img-base
#   base image for Lua runner images; ships base system utilities and
#   Lua runtime dependencies
#
#######################################################################
FROM alpine AS lua-img-base

# install lua runtime dependencies
RUN apk update && apk upgrade && apk add libgcc

# create a copy of the filesystem tree in /root/dist;
# NB: captures lua runtime dependencies;
RUN find / -xdev | sed -e '/[/]\(root\|run\)[/]/d' > /root/system-files.list && \
    mkdir /root/dist && \
    (cat /root/system-files.list | cpio -p /root/dist)

#######################################################################
#
# c-src-builder
#   base image for compiling C sources;
#   includes compilers + build tools + build dependencies;
#   also includes some of the source code to build
#
#######################################################################
FROM alpine AS c-src-builder

# install build dependencies
RUN apk update && apk upgrade && \
    apk add \
        build-base git curl zip outils-md5 linux-headers \
        flex bison gperf bsd-compat-headers nodejs

# pull luarocks; don't configure yet
RUN cd /root && \
    (wget -q -O - https://github.com/luarocks/luarocks/archive/v3.0.4.tar.gz | \
    tar -zxf - ) && mv /root/luarocks* /root/luarocks

# pull luajit;
# verify that the latest tag we care about is present;
# used for cache-busting
RUN cd root && git clone https://github.com/LuaJIT/LuaJIT.git luajit && \
    cd luajit && \
    git rev-parse -q --verify "refs/tags/v2.1.0-beta3" >/dev/null

# pull sandals
RUN cd root && git clone https://github.com/rapidlua/sandals.git \
    -c advice.detachedHead=false -b v1.0

#######################################################################
#
# sandals-builder
#
#######################################################################
FROM c-src-builder AS sandals-builder
RUN cd /root/sandals && make && DESTDIR=/root/dist make install

#######################################################################
#
# lua-img-builder
#
#######################################################################
FROM c-src-builder AS lua-img-builder

COPY --from=lua-img-base root/dist /root/dist 

COPY runner /root

#######################################################################
#
# luajit-2.0.4.builder
# luajit-2.1.0-beta3.builder
# ...
#   produces Lua runner images for various LuaJIT versions/flavours
#
#######################################################################
FROM lua-img-builder AS luajit-2.0.4.builder
RUN REV=v2.0.4 /root/dist-build.sh

FROM lua-img-builder AS luajit-2.1.0-beta2.builder
RUN REV=v2.1.0-beta2 /root/dist-build.sh

FROM lua-img-builder AS luajit-2.1.0-beta3.builder
RUN REV=v2.1.0-beta3 /root/dist-build.sh

FROM lua-img-builder AS luajit-2.1.0-beta3-gc64.builder
RUN REV=v2.1.0-beta3 GC64=1 /root/dist-build.sh

#######################################################################
#
# luajit.me.staging
#   combines bits and pieces together
#
#######################################################################
FROM alpine AS luajit.me.staging
RUN apk add fdupes

RUN mkdir -p /root/dist/usr/lib/luajit.me/images/dev/shm

COPY --from=sandals-builder root/dist /root/dist
COPY --from=luajit-2.0.4.builder root/dist /root/dist/usr/lib/luajit.me/images/luajit-2.0.4
COPY --from=luajit-2.1.0-beta2.builder root/dist /root/dist/usr/lib/luajit.me/images/luajit-2.1.0-beta2
COPY --from=luajit-2.1.0-beta3.builder root/dist /root/dist/usr/lib/luajit.me/images/luajit-2.1.0-beta3
COPY --from=luajit-2.1.0-beta3-gc64.builder root/dist /root/dist/usr/lib/luajit.me/images/luajit-2.1.0-beta3-gc64

COPY --from=luajit.me.builder root/dist /root/dist

# replace duplicate files with hardlinks
RUN fdupes -q -r1 /root/dist | \
    sed -e 's/^/TGT=/;s/ /; for SRC in /;s/$/; do ln -f $TGT $SRC; done/' | sh

###########

FROM node:10-alpine AS luajit.me
COPY --from=luajit.me.staging root/dist /

EXPOSE 8000
CMD ["node", "/usr/src/luajit.me/server/app.js"]
