pipeline {
    agent any

    environment {
        PROJECT_ID = "symmetric-ion-441609-t1" // Replace with your GCP project ID
        GCR_HOST = "us-central1-docker.pkg.dev/symmetric-ion-441609-t1/gc-registry07"
        IMAGE_NAME = "nodejs-mongo-app"
        IMAGE_TAG = "${BUILD_NUMBER}" // Use Jenkins build number as the tag
        KUBE_NAMESPACE = "node-mongo"
        HELM_CHART_DIR = "node-mongo-chart"
        GCP_SERVICE_ACCOUNT = "gcp-serv-acc" // GCP service account credentials
        KUBECONFIG_CREDENTIALS_ID = "kubeconfig" // Kubernetes kubeconfig credentials
        TRIVY_INSTALL_DIR = "${WORKSPACE}/trivy"
    }

    stages {
        stage('Authenticate with GCP') {
            steps {
                script {
                    withCredentials([file(credentialsId: GCP_SERVICE_ACCOUNT, variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
                        sh """
                        gcloud auth activate-service-account --key-file=$GOOGLE_APPLICATION_CREDENTIALS
                        gcloud config set project ${PROJECT_ID}
                        """
                    }
                }
            }
        }

        stage('Clone Repository') {
            steps {
                git url: 'https://github.com/akhilsathyan07/nodejs-mongo-app1.git', branch: 'main'
            }
        }

        stage('Run Tests and Generate Coverage') {
            steps {
                script {
                    // Install dependencies and run tests with coverage
                    sh """
                    npm install
                    npm test -- --coverage
                    """
                }
            }
        }

        stage('SonarQube Code Analysis') {
            steps {
                script {
                    def scannerHome = tool name: 'sonar-scanner', type: 'hudson.plugins.sonar.SonarRunnerInstallation'
                    withSonarQubeEnv('sonarqube') {
                        withCredentials([string(credentialsId: 'sonar-qube', variable: 'SONAR_TOKEN')]) {
                            sh """
                            ${scannerHome}/bin/sonar-scanner \
                                -Dsonar.projectVersion=1.0-SNAPSHOT \
                                -Dsonar.qualityProfile="Sonar way" \
                                -Dsonar.projectBaseDir=${WORKSPACE} \
                                -Dsonar.projectKey=sonarqube \
                                -Dsonar.sourceEncoding=UTF-8 \
                                -Dsonar.host.url=http://34.45.141.16:9000 \
                                -Dsonar.token=$SONAR_TOKEN \
                                -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
                            """
                        }
                    }
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    sh """
                    docker build -t ${GCR_HOST}/${IMAGE_NAME}:${BUILD_NUMBER} .
                    """
                }
            }
        }

        stage('Push Docker Image to GCR') {
            steps {
                script {
                    sh """
                    gcloud auth configure-docker ${GCR_HOST}
                    docker push ${GCR_HOST}/${IMAGE_NAME}:${BUILD_NUMBER}
                    """
                }
            }
        }

        stage('Install Trivy') {
            steps {
                script {
                    sh """
                    mkdir -p ${TRIVY_INSTALL_DIR}
                    curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b ${TRIVY_INSTALL_DIR}
                    """
                }
            }
        }

        stage('Scan Docker Image') {
            steps {
                script {
                    sh """
                    ${TRIVY_INSTALL_DIR}/trivy --version
                    docker images
                    ${TRIVY_INSTALL_DIR}/trivy image ${GCR_HOST}/${IMAGE_NAME}:${BUILD_NUMBER}
                    """
                }
            }
        }

        stage('Deploy with Helm') {
            steps {
                script {
                    withCredentials([file(credentialsId: KUBECONFIG_CREDENTIALS_ID, variable: 'KUBECONFIG')]) {
                        sh """
                        helm upgrade --install ${IMAGE_NAME} ${HELM_CHART_DIR} \
                            --namespace ${KUBE_NAMESPACE} \
                            --create-namespace \
                            --set app.image.repository=${GCR_HOST}/${IMAGE_NAME} \
                            --set app.image.tag=${BUILD_NUMBER} \
                            --kubeconfig $KUBECONFIG
                        """
                    }
                }
            }
        }
    }

    post {
        success {
            echo 'Deployment completed successfully!'
        }
        failure {
            echo 'Deployment failed!'
        }
    }
}
