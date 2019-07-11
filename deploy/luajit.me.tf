variable "do_token" {}
variable "pub_key" {}
variable "pvt_key" {}
variable "ssh_fingerprint" {}

provider "digitalocean" {
  token = var.do_token
}

resource "digitalocean_domain" "default" {
  name = "luajit.me"
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
  count = 2

  image = "ubuntu-18-04-x64"
  name = "web-${count.index+1}"
  region = "ams3"
  size = "s-1vcpu-1gb"
  private_networking = true
  ssh_keys = [ var.ssh_fingerprint ]

  provisioner "file" {
    connection {
      host = self.ipv4_address
      user = "root"
      type = "ssh"
      private_key = file(var.pvt_key)
    }
    source = "nginx.conf"
    destination = "/root/nginx.conf"
  }

  provisioner "remote-exec" {
    connection {
      host = self.ipv4_address
      user = "root"
      type = "ssh"
      private_key = file(var.pvt_key)
    }
    inline = [
      "set -eux",
      "curl -sSL https://repos.insights.digitalocean.com/install.sh | bash",
      file("install-docker.sh"),
      "docker run --detach --restart=unless-stopped --init --publish=127.0.0.1:8000:8000 --security-opt seccomp=unconfined --security-opt apparmor:unconfined rapidlua/luajit.me",
      "apt-get install -y --no-install-recommends nginx",
      "mkdir -p /data/nginx/cache",
      "chown www-data: /data/nginx/cache",
      "sed '-es/<SELF_IPV4_ADDRESS>/${self.ipv4_address_private}/' /root/nginx.conf > /etc/nginx/sites-available/luajit.me",
      "for IPV4_ADDRESS in ${join(" ", digitalocean_droplet.compute.*.ipv4_address_private)}; do sed -i /etc/nginx/sites-available/luajit.me -e \"/COMPUTE_IPV4_ADDRESS/a\\ \\ server $${IPV4_ADDRESS}:80;\"; done",
      "ln -s /etc/nginx/sites-available/luajit.me /etc/nginx/sites-enabled/luajit.me",
      "rm /etc/nginx/sites-enabled/default",
      "service nginx restart"
    ]
  }
}

resource "digitalocean_droplet" "compute" {
  count = 5

  image = "ubuntu-18-04-x64"
  name = "compute-${count.index+1}"
  region = "ams3"
  size = "s-1vcpu-1gb"
  private_networking = true
  ssh_keys = [ var.ssh_fingerprint ]

  provisioner "remote-exec" {
    connection {
      host = self.ipv4_address
      user = "root"
      type = "ssh"
      private_key = file(var.pvt_key)
    }
    inline = [
      "set -eux",
      "curl -sSL https://repos.insights.digitalocean.com/install.sh | bash",
      file("install-docker.sh"),
      "docker run --detach --restart=unless-stopped --init --publish=${self.ipv4_address_private}:80:8000 --security-opt seccomp=unconfined --security-opt apparmor:unconfined rapidlua/luajit.me"
    ]
  }
}

resource "null_resource" "update_compute_cluster_user_web" {
  count = length(digitalocean_droplet.web)
  triggers = {
    compute_cluster_ips = join(" ", digitalocean_droplet.compute.*.ipv4_address_private)
  }
  provisioner "remote-exec" {
    connection {
      host = digitalocean_droplet.web[count.index].ipv4_address
      user = "root"
      type = "ssh"
      private_key = file(var.pvt_key)
    }
    inline = [
      "sed -e '/COMPUTE_IPV4_ADDRESS/,/}/{/server/d}' -i /etc/nginx/sites-available/luajit.me",
      "for IPV4_ADDRESS in ${join(" ", digitalocean_droplet.compute.*.ipv4_address_private)}; do sed -i /etc/nginx/sites-available/luajit.me -e \"/COMPUTE_IPV4_ADDRESS/a\\ \\ server $${IPV4_ADDRESS}:80;\"; done",
      "service nginx reload"
    ]
  }
}
