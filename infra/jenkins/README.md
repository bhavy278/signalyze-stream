# Local Jenkins CI

Runs a local Jenkins that builds and tests all four services and builds their
Docker images on each pipeline run, using the pipeline defined in the repo's
root `Jenkinsfile`.

## Start Jenkins

```bash
cd infra/jenkins
docker compose up -d --build
```

Get the initial admin password:

```bash
docker exec signalyze-jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

Open http://localhost:8090, paste the password, choose **Install suggested
plugins**, and create your admin user.

## Create the pipeline job

1. **New Item** → name it `signalyze-stream` → **Pipeline** → OK.
2. Under **Pipeline**, set **Definition** = *Pipeline script from SCM*.
3. **SCM** = Git, **Repository URL** = `https://github.com/bhavy278/signalyze-stream.git`,
   **Branch** = `*/main`, **Script Path** = `Jenkinsfile`.
4. Save → **Build Now**.

The pipeline runs `./gradlew test` for all four services in parallel (the
query-service integration test spins up MongoDB via Testcontainers on the host
Docker daemon), publishes the JUnit results, then builds the four service images.

## Stop / reset

```bash
docker compose down          # stop (keeps jenkins_home volume)
docker compose down -v       # stop and wipe Jenkins config
```
