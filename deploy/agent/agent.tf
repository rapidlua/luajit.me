variable "do_token" {}
variable "public_key" {}
variable "private_key" {}
variable "ssh_fingerprint" {}

provider "digitalocean" {
  token = var.do_token
}

resource "digitalocean_droplet" "deploy" {
  image = "ubuntu-18-04-x64"
  name = "deploy"
  region = "ams3"
  size = "s-1vcpu-1gb"
  ssh_keys = [ var.ssh_fingerprint ]

  connection {
    host = self.ipv4_address
    user = "root"
    type = "ssh"
    private_key = file(var.private_key)
  }

  provisioner "file" {
    source = "deploy.nginx.conf"
    destination = "/root/deploy.nginx.conf"
  }

  provisioner "file" {
    source = "env.sh"
    destination = "/root/env.sh"
  }

  provisioner "file" {
    source = var.public_key
    destination = "/root/.ssh/${basename(var.public_key)}"
  }

  provisioner "file" {
    source = var.private_key
    destination = "/root/.ssh/${basename(var.private_key)}"
  }

  provisioner "remote-exec" {
    inline = [
      "set -eux",
      ". /root/env.sh",

      // System update
      "apt-get update",
      "DEBIAN_FRONTEND=noninteractive apt-get dist-upgrade -y --no-install-recommends",

      // Docker
      "apt-get install -y --no-install-recommends apt-transport-https curl",
      "apt-get install -y --no-install-recommends ca-certificates gnupg-agent software-properties-common",
      "curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -",
      "add-apt-repository \"deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable\"",
      "apt-get update",
      "mkdir -p /etc/docker",
      "echo '{\"userns-remap\":\"default\"}' > /etc/docker/daemon.json",
      "apt-get install -y --no-install-recommends docker-ce docker-ce-cli containerd.io",

      // DO agent
      "curl -sSL https://repos.insights.digitalocean.com/install.sh | bash",

      // node, npm, jq
      "apt-get update",
      "apt-get install -y --no-install-recommends nodejs npm jq",

      // terraform
      "apt-get install -y --no-install-recommends unzip",
      "curl https://releases.hashicorp.com/terraform/0.12.8/terraform_0.12.8_linux_amd64.zip -o terraform.zip",
      "unzip terraform.zip",
      "install terraform /usr/bin",

      // user
      "useradd -UmG docker deploy",
      "install -dodeploy -gdeploy -m0700 /home/deploy/.ssh",
      "install -Dodeploy -gdeploy -m0600  /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys",
      "install -odeploy -gdeploy -m0600 $${TF_VAR_public_key} /home/deploy/.ssh/",
      "install -odeploy -gdeploy -m0600 $${TF_VAR_private_key} /home/deploy/.ssh/",
      "install -odeploy -gdeploy -m0600  /root/env.sh /home/deploy/env.sh",
      "install -dodeploy -gdeploy /home/deploy/logs",
      "echo '. ~/env.sh' >> /home/deploy/.profile",
      "su -lc 'docker login -u $${DOCKERHUB_LOGIN} -p $${DOCKERHUB_PASSWORD}' deploy",
      "su -lc 'git clone https://github.com/rapidlua/luajit.me.git ~/luajit.me.git' deploy",
      "su -lc 'cd ~/luajit.me.git/deploy/agent && npm install' deploy",

      // auto-deploy service
      "install -odeploy -gdeploy /dev/null /home/deploy/.agent-disable",
      "install /home/deploy/luajit.me.git/deploy/agent/auto_deploy.service /etc/systemd/system",
      "systemctl enable auto_deploy",
      "systemctl start auto_deploy",

      // Nginx
      "apt-get install -y --no-install-recommends nginx",
      "cp /root/deploy.nginx.conf /etc/nginx/sites-available/deploy.luajit.me",
      "ln -s /etc/nginx/sites-available/deploy.luajit.me /etc/nginx/sites-enabled/deploy.luajit.me",
      "rm /etc/nginx/sites-enabled/default",
      "service nginx reload",

      // certbot
      "add-apt-repository -y ppa:certbot/certbot",
      "apt-get install -y --no-install-recommends python-certbot-nginx",

      "systemd-run sh -c 'sleep 1; reboot'"
    ]
 }

 // finishing touches (manual)
 // certbot --nginx -d deploy.luajit.me
}

resource "digitalocean_floating_ip" "default" {
  droplet_id = digitalocean_droplet.deploy.id
  region = "ams3"
}

resource "digitalocean_record" "deploy" {
  domain = "luajit.me"
  type = "A"
  name = "deploy"
  value = digitalocean_floating_ip.default.ip_address
}
