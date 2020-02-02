output "web_cluster" {
  value = digitalocean_droplet.web
}

output "compute_cluster_amd64" {
  value = digitalocean_droplet.compute_amd64
}
