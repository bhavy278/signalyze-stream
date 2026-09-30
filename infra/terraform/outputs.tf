output "public_ip" {
  description = "Public IP of the instance"
  value       = aws_instance.app.public_ip
}

output "public_dns" {
  description = "Public DNS of the instance"
  value       = aws_instance.app.public_dns
}

output "urls" {
  description = "Where to reach the app once user-data finishes (give it a few minutes to build + start)"
  value = {
    app        = "http://${aws_instance.app.public_ip}:3000"
    gateway    = "http://${aws_instance.app.public_ip}:8085"
    grafana    = "http://${aws_instance.app.public_ip}:3001"
    prometheus = "http://${aws_instance.app.public_ip}:9090"
    kafka_ui   = "http://${aws_instance.app.public_ip}:8080"
    ssh        = "ssh ec2-user@${aws_instance.app.public_ip}"
  }
}
