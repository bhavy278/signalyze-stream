# Jenkins LTS with JDK 21 (to run the Gradle builds) + the Docker CLI
# (so pipeline stages can build images against the mounted host daemon).
FROM jenkins/jenkins:lts-jdk21

USER root
RUN apt-get update \
 && apt-get install -y --no-install-recommends docker.io \
 && rm -rf /var/lib/apt/lists/*
USER jenkins
