variable "do_token" {}
variable "private_key" {}
variable "ssh_fingerprint" {}

variable "image_id" {
  type = string
  description = "Image to spawn droplets from; should have all system updates and prerequisite packages installed"
}

variable "revision" {
  type = string
  description = "Source code revision; re-create droplets if revision changes"
  default = ""
}

variable "web_scale" {
  type = number
  default = 2
  description = "Number of web nodes to deploy"
}

variable "compute_scale" {
  type = number
  default = 5
  description = "Number of compute nodes to deploy"
}

provider "digitalocean" {
  token = var.do_token
}

resource "digitalocean_record" "default" {
  domain = "luajit.me"
  type = "A"
  name = "@"
  value = digitalocean_loadbalancer.default.ip
}

resource "digitalocean_record" "www" {
  domain = "luajit.me"
  type = "CNAME"
  name = "www"
  value = "@"
}

resource "digitalocean_certificate" "default" {
  lifecycle { create_before_destroy = true }
  name = "cert-1"
  type = "lets_encrypt"
  domains = ["luajit.me", "www.luajit.me"]
}

resource "digitalocean_loadbalancer" "default" {
  name = "loadbalancer-1"
  region = "ams3"

  forwarding_rule {
    entry_port = 80
    entry_protocol = "http"
    target_port = 80
    target_protocol = "http"
  }
  
  forwarding_rule {
    entry_port = 443
    entry_protocol = "https"
    target_port = 80
    target_protocol = "http"
    certificate_id = digitalocean_certificate.default.id
  }
  
  redirect_http_to_https = true

  droplet_ids = digitalocean_droplet.web.*.id
}

resource "digitalocean_droplet" "web" {
  count = var.web_scale
  lifecycle { create_before_destroy = true }
  user_data = "revision=${var.revision}" # should trigger replacement if changed

  image = var.image_id
  name = "web-${count.index+1}"
  region = "ams3"
  size = "s-1vcpu-1gb"
  private_networking = true
  ssh_keys = [ var.ssh_fingerprint ]

  connection {
    host = self.ipv4_address
    user = "root"
    type = "ssh"
    private_key = file(var.private_key)
  }

  provisioner "file" {
    source = "app.nginx.conf"
    destination = "/root/app.nginx.conf"
  }

  provisioner "remote-exec" {
    inline = [
      "set -eux",
      "docker pull rapidlua/luajit.me",
      "docker run --detach --restart=unless-stopped --init --publish=127.0.0.1:8000:8000 -e GA_MEASUREMENT_ID=UA-143778823-2 rapidlua/luajit.me",
      "mkdir -p /data/nginx/cache",
      "chown www-data: /data/nginx/cache",
      "sed '-es/<SELF_IPV4_ADDRESS>/${self.ipv4_address_private}/' /root/app.nginx.conf > /etc/nginx/sites-available/luajit.me",
      "for IPV4_ADDRESS in ${join(" ", digitalocean_droplet.compute.*.ipv4_address_private)}; do sed -i /etc/nginx/sites-available/luajit.me -e \"/COMPUTE_IPV4_ADDRESS/a\\ \\ server $${IPV4_ADDRESS}:80;\"; done",
      "ln -s /etc/nginx/sites-available/luajit.me /etc/nginx/sites-enabled/luajit.me",
      "rm /etc/nginx/sites-enabled/default",
      "systemctl enable nginx",
      "service nginx start"
    ]
  }
}

resource "digitalocean_droplet" "compute" {
  count = var.compute_scale
  lifecycle { create_before_destroy = true }
  user_data = "revision=${var.revision}" # should trigger replacement if changed

  image = var.image_id
  name = "compute-${count.index+1}"
  region = "ams3"
  size = "s-1vcpu-1gb"
  private_networking = true
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
      "docker pull rapidlua/luajit.me",
      "docker run --detach --restart=unless-stopped --init --publish=${self.ipv4_address_private}:80:8000 --security-opt seccomp=unconfined --security-opt apparmor:unconfined rapidlua/luajit.me"
    ]
  }
}

resource "null_resource" "update_compute_cluster_users" {
  count = length(digitalocean_droplet.web)
  triggers = {
    compute_cluster_ips = join(" ", digitalocean_droplet.compute.*.ipv4_address_private)
  }
  connection {
    host = digitalocean_droplet.web[count.index].ipv4_address
    user = "root"
    type = "ssh"
    private_key = file(var.private_key)
  }
  provisioner "remote-exec" {
    inline = [
      "sed -e '/COMPUTE_IPV4_ADDRESS/,/}/{/server/d}' -i /etc/nginx/sites-available/luajit.me",
      "for IPV4_ADDRESS in ${join(" ", digitalocean_droplet.compute.*.ipv4_address_private)}; do sed -i /etc/nginx/sites-available/luajit.me -e \"/COMPUTE_IPV4_ADDRESS/a\\ \\ server $${IPV4_ADDRESS}:80;\"; done",
      "service nginx reload"
    ]
  }
}
