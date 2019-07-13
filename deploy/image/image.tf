variable "do_token" {}
variable "private_key" {}
variable "ssh_fingerprint" {}
variable "image_checksum" {}

variable "base_image" {
  type = string
  default = "ubuntu-18-04-x64"
}

provider "digitalocean" {
  token = var.do_token
}

resource "digitalocean_droplet" "image_builder" {

  image = var.base_image
  name = "image-builder"
  region = "ams3"
  size = "s-1vcpu-1gb"
  ssh_keys = [ var.ssh_fingerprint ]

  connection {
    host = self.ipv4_address
    user = "root"
    type = "ssh"
    private_key = file(var.private_key)
  }

  provisioner "remote-exec" {
    inline = [
      "set -eux",

      "apt-get update",
      "DEBIAN_FRONTEND=noninteractive apt-get dist-upgrade -y --no-install-recommends",

      "apt-get install -y --no-install-recommends apt-transport-https curl",
      "apt-get install -y --no-install-recommends ca-certificates gnupg-agent software-properties-common",
      "curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -",
      "add-apt-repository \"deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable\"",
      "apt-get update",
      "mkdir -p /etc/docker",
      "echo '{\"userns-remap\":\"default\"}' > /etc/docker/daemon.json",
      "apt-get install -y --no-install-recommends docker-ce docker-ce-cli containerd.io",
      "docker pull rapidlua/luajit.me",

      "apt-get install -y --no-install-recommends nginx",
      "systemctl disable nginx",

      "curl -sSL https://repos.insights.digitalocean.com/install.sh | bash",

      "systemd-run sh -c 'sleep 1; poweroff'"
    ]
  }

  // Wait for poweroff until proceeding; prereq for a consistent snapshot 
  provisioner "local-exec" {
    command = "while [ $(curl -sX GET -H 'Content-Type: application/json' -H 'Authorization: Bearer ${var.do_token}' 'https://api.digitalocean.com/v2/droplets/${self.id}' | jq -r .droplet.status) != off ]; do echo 'waiting for poweroff'; sleep 3; done"
  }
}

resource "digitalocean_droplet_snapshot" "image" {
  droplet_id = "${digitalocean_droplet.image_builder.id}"
  name = "${var.base_image}-custom-${var.image_checksum}"

  // Delete the droplet used to produce the snapshot
  provisioner "local-exec" {
    command = "curl -sX DELETE -H 'Content-Type: application/json' -H 'Authorization: Bearer ${var.do_token}' 'https://api.digitalocean.com/v2/droplets/${digitalocean_droplet.image_builder.id}'"
  }
}

output "image_id" {
  value = digitalocean_droplet_snapshot.image.id
}

output "image_checksum" {
  value = replace(digitalocean_droplet_snapshot.image.name, "/.*-/", "")
}
