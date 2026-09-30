# Signalyze Stream — AWS deployment (Terraform + EC2)

Provisions a single EC2 instance (Amazon Linux 2023) in a minimal public VPC and, via
user-data, installs Docker, clones the repo, writes `.env`, and brings the whole stack up
with `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`.

MongoDB lives on Atlas, so nothing stateful runs here — the box is disposable. Spin it up to
demo, then **`terraform destroy`** to stop paying.

## Prerequisites
- Terraform >= 1.6, AWS CLI configured (`aws configure`) with credentials that can create VPC/EC2.
- An **EC2 key pair** already created in your target region (for SSH).

## Use
```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars   # fill in key_name, ssh_cidr, and the 3 secrets
terraform init
terraform plan
terraform apply        # prints the public IP + URLs
```
User-data then builds the images on the instance — give it ~10-15 min after `apply` before the
URLs respond. Watch progress over SSH: `sudo tail -f /var/log/signalyze-bootstrap.log`.

Outputs include the app (`:3000`), gateway (`:8085`), Grafana (`:3001`), Prometheus (`:9090`),
and Kafka UI (`:8080`).

## Cost — keep it near zero (occasional-use portfolio project)

The instance-hours are the only meaningful cost, so the rule is simple: **only pay while
you're actually demoing.** `t3.large` is ~\$0.083/hr and the 30GB disk is ~\$2.40/mo *while
resources exist*.

- **Spin up to demo, then destroy** — this is the minimum. `terraform destroy` removes the
  instance AND the disk, so you pay **\$0 between uses**. A demo session is a few cents.
  Re-`apply` when you next need it (~10-15 min to rebuild on the box).
- **Or stop instead of destroy** if you want faster restarts: `aws ec2 stop-instances
  --instance-ids <id>`. A stopped instance costs **\$0 compute** — you pay only ~\$2.40/mo
  for the disk. `start-instances` brings it back in ~1 min (no rebuild). Public IP changes on
  restart.
- Set a **billing alert** (AWS Billing → Budgets, \$5 threshold) as a safety net against
  forgetting.

```bash
terraform destroy        # tear everything down -> \$0
```

## Notes / trade-offs
- Secrets are passed via Terraform variables into the instance's `.env` and user-data; for a
  brief demo that's fine, but they land in the Terraform state and instance metadata. For
  anything longer-lived, move them to SSM Parameter Store / Secrets Manager.
- Images are built on the instance (simple, self-contained). `t3.xlarge` handles the parallel
  builds comfortably; drop to `t3.large` to save cost if you build carefully.
- `terraform.tfvars` and all state files are gitignored — never commit secrets or state.
