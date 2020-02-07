data "digitalocean_image" "base_image" {
  count = (var.app_version == "" ? 0 : 1)
  name = "image-${var.app_version}"
}

# terraform destroy workaround
locals {
  image_id = var.app_version == "" ? 0 : data.digitalocean_image.base_image[0].id
}

resource "digitalocean_droplet" "web" {
  count = var.web_cluster_size
  lifecycle { create_before_destroy = true }
  tags = [ "luajit-me" ]

  image = local.image_id
  name = "${var.prefix}web-${count.index+1}"
  region = "ams3"
  size = "s-1vcpu-1gb"
  private_networking = true
  ssh_keys = [ var.ssh_key_fingerprint ]

  connection {
    host = self.ipv4_address
    user = "root"
    type = "ssh"
    private_key = file(var.ssh_private_key_file)
  }

  provisioner "file" {
    source = "${path.module}/app.nginx.conf"
    destination = "/root/app.nginx.conf"
  }

  provisioner "remote-exec" {
    inline = [
      "set -eux",
      "docker pull rapidlua/luajit.me:${var.app_version}",
      "docker run --detach --restart=unless-stopped --init --publish=127.0.0.1:8000:8000 -e GA_MEASUREMENT_ID=UA-143778823-2 rapidlua/luajit.me:${var.app_version}",
      "mkdir -p /data/nginx/cache",
      "chown www-data: /data/nginx/cache",
      "sed '-es/<SELF_IPV4_ADDRESS>/${self.ipv4_address_private}/' /root/app.nginx.conf > /etc/nginx/sites-available/luajit.me",
      "ln -s /etc/nginx/sites-available/luajit.me /etc/nginx/sites-enabled/luajit.me",
      "rm /etc/nginx/sites-enabled/default",
      "systemctl enable nginx",
      "service nginx start"
    ]
  }
}

resource "digitalocean_droplet" "compute_amd64" {
  for_each = zipmap(var.compute_cluster_amd64_nodes, var.compute_cluster_amd64_nodes)
  lifecycle { create_before_destroy = true }
  tags = [ "luajit-me" ]

  image = local.image_id
  name = "${var.prefix}compute-amd64-${each.key}"
  region = "ams3"
  size = "s-1vcpu-1gb"
  private_networking = true
  ssh_keys = [ var.ssh_key_fingerprint ]

  connection {
    host = self.ipv4_address
    user = "root"
    type = "ssh"
    private_key = file(var.ssh_private_key_file)
  }

  provisioner "remote-exec" {
    inline = [
      "set -eux",
      "docker pull rapidlua/luajit.me:${var.app_version}",
      "docker run --detach --restart=unless-stopped --init --publish=${self.ipv4_address_private}:80:8000 --security-opt seccomp=unconfined --security-opt apparmor:unconfined rapidlua/luajit.me:${var.app_version}"
    ]
  }
}

resource "null_resource" "configure_compute_cluster_user" {
  count = length(digitalocean_droplet.web)
  triggers = {
    compute_cluster_amd64_ips = join(" ", values(digitalocean_droplet.compute_amd64).*.ipv4_address_private)
  }
  connection {
    host = digitalocean_droplet.web[count.index].ipv4_address
    user = "root"
    type = "ssh"
    private_key = file(var.ssh_private_key_file)
  }
  provisioner "remote-exec" {
    inline = [
      <<EOT
(echo '/COMPUTE_AMD64_IPV4_ADDRESS/,/}/{/server/d};/COMPUTE_AMD64_IPV4_ADDRESS/{';
%{ for ip in values(digitalocean_droplet.compute_amd64).*.ipv4_address_private }
echo 'a\ \ server ${ip}:80;';
%{ endfor }
echo '}' ) | sed -f /dev/stdin -i /etc/nginx/sites-available/luajit.me
EOT
      , "service nginx reload"
    ]
  }
}
