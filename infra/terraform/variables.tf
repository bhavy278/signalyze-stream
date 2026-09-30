variable "project" {
  description = "Name prefix for tagged resources"
  type        = string
  default     = "signalyze"
}

variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type. t3.large (8GB) is the cheapest that reliably runs the whole stack (a swapfile covers the build spike). t3.xlarge is roomier but 2x the cost."
  type        = string
  default     = "t3.large"
}

variable "root_volume_gb" {
  description = "Root EBS volume size (GB). Needs headroom for images + build cache."
  type        = number
  default     = 30
}

variable "key_name" {
  description = "Name of an existing EC2 key pair in this region (for SSH). Create one in the AWS console first."
  type        = string
}

variable "ssh_cidr" {
  description = "CIDR allowed to SSH (port 22). Set to YOUR_IP/32; defaults open for convenience."
  type        = string
  default     = "0.0.0.0/0"
}

variable "app_cidr" {
  description = "CIDR allowed to reach the app/monitoring ports."
  type        = string
  default     = "0.0.0.0/0"
}

variable "app_ports" {
  description = "TCP ports to expose: frontend, gateway, kafka-ui, grafana, prometheus."
  type        = list(number)
  default     = [3000, 8085, 8080, 3001, 9090]
}

variable "repo_url" {
  description = "Public git URL to clone on the instance"
  type        = string
  default     = "https://github.com/bhavy278/signalyze-stream.git"
}

variable "mongodb_uri" {
  description = "MongoDB Atlas connection string"
  type        = string
  sensitive   = true
}

variable "openai_api_key" {
  description = "OpenAI API key"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "Shared JWT signing secret (64+ chars)"
  type        = string
  sensitive   = true
}
