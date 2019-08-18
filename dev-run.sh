#! /bin/bash
set -euxo pipefail
cd app
docker build  --iidfile .dockerid . 
docker run \
    --init --rm -p8000:8000 \
    --volume $(realpath server/public):/usr/src/luajit.me/server/public \
    --security-opt seccomp=unconfined \
    --security-opt apparmor:unconfined \
    $(cat .dockerid)
