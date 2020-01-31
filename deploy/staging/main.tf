provider "digitalocean" {
  token = var.digitalocean_token
  version = 1.7
}

module "backend" {
  source = "../modules/backend"
  prefix = "staging."
  ssh_key_fingerprint = var.ssh_key_fingerprint
  ssh_private_key_file = var.ssh_private_key_file
  app_version = var.app_version
  web_cluster_size = 1
  compute_cluster_amd64_nodes = [ 1 ]
}
