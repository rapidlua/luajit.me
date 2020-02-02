output "web_cluster" {
  value = digitalocean_droplet.web
  depends_on = [
    null_resource.configure_compute_cluster_user
  ]
}

output "compute_cluster_amd64" {
  value = digitalocean_droplet.compute_amd64
}
