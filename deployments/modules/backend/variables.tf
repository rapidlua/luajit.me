variable "prefix" {
  type = string
  default = ""
}

variable "ssh_key_fingerprint" {
  type = string
}

variable "ssh_private_key_file" {
  type = string
}

variable "app_version" {
  type = string
}

variable "web_cluster_size" {
  type = number
  description = "Number of web nodes to deploy"
}

variable "compute_cluster_amd64_nodes" {
  type = list
  description = "The list of compute nodes to deploy (amd64)"
}
