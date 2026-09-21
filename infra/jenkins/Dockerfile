# Jenkins LTS with JDK 21 (to run the Gradle builds) + the Docker CLI
# (so pipeline stages can build images against the mounted host daemon).
# The CLI is the official static binary, matched to the image architecture.
FROM jenkins/jenkins:lts-jdk21

USER root
ARG DOCKER_VERSION=27.3.1
RUN set -eux; \
    arch="$(uname -m)"; \
    curl -fsSL "https://download.docker.com/linux/static/stable/${arch}/docker-${DOCKER_VERSION}.tgz" -o /tmp/docker.tgz; \
    tar -xzf /tmp/docker.tgz -C /usr/local/bin --strip-components=1 docker/docker; \
    rm /tmp/docker.tgz; \
    docker --version
USER jenkins
