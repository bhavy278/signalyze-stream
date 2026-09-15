pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '15'))
    }

    environment {
        // Testcontainers (query-service integration test) talks to the host Docker
        // daemon via the mounted socket; on Docker Desktop the host is reachable here.
        TESTCONTAINERS_HOST_OVERRIDE = 'host.docker.internal'
        TESTCONTAINERS_RYUK_DISABLED = 'true'
    }

    stages {
        stage('Test') {
            parallel {
                stage('auth-service') {
                    steps { dir('services/auth-service') { sh 'chmod +x gradlew && ./gradlew clean test --no-daemon' } }
                }
                stage('ingest-service') {
                    steps { dir('services/ingest-service') { sh 'chmod +x gradlew && ./gradlew clean test --no-daemon' } }
                }
                stage('processing-service') {
                    steps { dir('services/processing-service') { sh 'chmod +x gradlew && ./gradlew clean test --no-daemon' } }
                }
                stage('query-service') {
                    steps { dir('services/query-service') { sh 'chmod +x gradlew && ./gradlew clean test --no-daemon' } }
                }
            }
        }

        stage('Build images') {
            steps {
                sh '''
                    for svc in auth-service ingest-service processing-service query-service; do
                        echo "Building image for $svc"
                        docker build -t signalyze/$svc:$BUILD_NUMBER -t signalyze/$svc:latest services/$svc
                    done
                '''
            }
        }
    }

    post {
        always {
            junit testResults: '**/build/test-results/test/*.xml', allowEmptyResults: true
        }
        success { echo 'Pipeline succeeded: all services tested and imaged.' }
        failure { echo 'Pipeline failed — check the failing stage above.' }
    }
}
