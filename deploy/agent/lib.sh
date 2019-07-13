#! /bin/sh

# exit code
#   100 agent updated, restart
#   101 transient failure
set -eux

export "GIT_BRANCH=${GIT_BRANCH:-master}"

notify_operator() {
  curl "https://api.telegram.org/bot${TELEGRAM_DEPLOY_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TELEGRAM_DEPLOY_CHANNEL_ID}" \
    --data-urlencode "text=$1" || true
}

fetch_source_code() {

  git fetch || exit 101

  if [ $(git rev-parse "${GIT_BRANCH}") != $(git rev-parse "origin/${GIT_BRANCH}") ]; then

    notify_operator "$(
      echo Git: remote changes detected
      git log --oneline origin/${GIT_BRANCH} --not ${GIT_BRANCH} | awk '{print"+ "$0}'
      git log --oneline ${GIT_BRANCH} --not origin/${GIT_BRANCH} | awk '{print"- "$0}'
    )"

    if [ -f "${HOME}/.agent-disable" ]; then

      notify_operator "Agent disabled, remove ${HOME}/.agent-disable"
      exit 0;

    fi

  else

    return 0

  fi

  local OLD_DEPLOY_AGENT_CHECKSUM=$(
    git archive ${GIT_BRANCH} deploy/agent | sha256sum | awk '{print$1}'
  )

  local DEPLOY_AGENT_CHECKSUM=$(
    git archive origin/${GIT_BRANCH} deploy/agent | sha256sum | awk '{print$1}'
  )

  git reset --hard origin/${GIT_BRANCH}

  if [ ${OLD_DEPLOY_AGENT_CHECKSUM} != ${DEPLOY_AGENT_CHECKSUM} ]; then
    notify_operator "Deploy agent updated; restarting"
    (cd deploy/agent && npm install)
    exit 100
  fi

  HAVE_CHANGES=1
}

cond_build_and_deploy() {
  if [ -n "${HAVE_CHANGES:-}" ]; then build; deploy; fi
}

build() {
  if [ -f "${HOME}/.agent-disable" ]; then exit 0; fi

  local APP_BUILD_LOG=logs/$(date -Ins | md5sum | awk '{print$1}')

  notify_operator "Build started
https://deploy.luajit.me/${APP_BUILD_LOG}"
  if ! (
    set -eux
    cd app
    DOCKER_BUILDKIT=1 docker build --progress=plain -trapidlua/luajit.me .
  ) > "${HOME}/${APP_BUILD_LOG}" 2>&1; then

    notify_operator "$(echo Build failed; tail "${HOME}/${APP_BUILD_LOG}")"
    exit 0

  fi

  if ! (
    docker push rapidlua/luajit.me
  ) >> "${HOME}/${APP_BUILD_LOG}" 2>&1; then

    notify_operator "$(echo Build failed; tail "${HOME}/${APP_BUILD_LOG}")"
    exit 101

  fi
}

deploy() {

  if [ -f "${HOME}/.agent-disable" ]; then exit 0; fi

  local IMAGE_CHECKSUM=$(
    git archive ${GIT_BRANCH} deploy/image | sha256sum | awk '{print$1}'
  )

  echo "image_checksum=\"${IMAGE_CHECKSUM}\"" > deploy/image/image.auto.tfvars

  local OLD_IMAGE_CHECKSUM=$(
    cd deploy/image; terraform refresh | awk '/image_checksum/{print$3}'
  )

  if [ "${OLD_IMAGE_CHECKSUM}" != "${IMAGE_CHECKSUM}" ]; then

    local IMAGE_BUILD_LOG=logs/$(date -Ins | md5sum | awk '{print$1}')

    notify_operator "Building image
https://deploy.luajit.me/${IMAGE_BUILD_LOG}"

    if ! (
      set -eux
      cd deploy/image
      terraform init -input=false -no-color
      terraform apply -input=false -no-color -auto-approve
    ) > "${HOME}/${IMAGE_BUILD_LOG}" 2>&1; then
    
      notify_operator "$(echo Build failed; tail "${HOME}/${IMAGE_BUILD_LOG}")"
      exit 0

    fi

  fi

  local IMAGE_ID=$(
    cd deploy/image; terraform output | awk '/image_id/{print$3}'
  )

  # deploy app
  (
    echo "revision=\"$(git rev-parse "${GIT_BRANCH}")\""
    echo "image_id=\"${IMAGE_ID}\""
  ) > deploy/app/app.auto.tfvars

  local DEPLOY_LOG=logs/$(date -Ins | md5sum | awk '{print$1}')

  notify_operator "Deploying
https://deploy.luajit.me/${DEPLOY_LOG}"

  if ! (
    set -eux
    cd deploy/app
    terraform init -input=false -no-color
    terraform apply -input=false -no-color -auto-approve
  ) > "${HOME}/${DEPLOY_LOG}" 2>&1; then

    notify_operator "$(echo Deploy failed; tail "${HOME}/${DEPLOY_LOG}")"
    notify_operator "Agent disabled, remove ${HOME}/.agent-disable to enable"
    touch "${HOME}/.agent-disable"
    exit 0

  fi

  notify_operator "Deploy succeeded"
}
