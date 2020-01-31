provider "digitalocean" {
  token = var.digitalocean_token
  version = 1.7
}

module "backend" {
  source = "../modules/backend"
  ssh_key_fingerprint = var.ssh_key_fingerprint
  ssh_private_key_file = var.ssh_private_key_file
  app_version = var.app_version
  web_cluster_size = var.web_cluster_size
  compute_cluster_amd64_nodes = var.compute_cluster_amd64_nodes
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
    certificate_id = data.digitalocean_certificate.default.id
  }
  
  redirect_http_to_https = true

  droplet_ids = module.backend.web_cluster.*.id
}

data "digitalocean_certificate" "default" {
  name = "cert-1"
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
