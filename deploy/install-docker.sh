
apt-get update

apt-get install -y --no-install-recommends \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg-agent \
    software-properties-common

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -

add-apt-repository \
   "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
   $(lsb_release -cs) \
   stable"

apt-get update

mkdir -p /etc/docker
echo '{"userns-remap":"default"}' > /etc/docker/daemon.json

apt-get install -y --no-install-recommends \
    docker-ce docker-ce-cli containerd.io
