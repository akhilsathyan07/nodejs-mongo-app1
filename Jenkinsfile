pipeline {
    agent any

    environment {
        // Google Cloud Project and GCR Configuration
        PROJECT_ID = "symmetric-ion-441609-t1" // Replace with your GCP project ID
        GCR_HOST = "us-central1-docker.pkg.dev/symmetric-ion-441609-t1/gc-registry07"
        IMAGE_NAME = "nodejs-mongo-app"
        IMAGE_TAG = "${BUILD_NUMBER}" // Use Jenkins build number as the tag
        
        // Kubernetes Namespace
        KUBE_NAMESPACE = "node-mongo"
        
        // Helm Chart Location
        HELM_CHART_DIR = "node-mongo-chart"

        // Credentials
        GCP_SERVICE_ACCOUNT = "gcp-serv-acc" // GCP service account credentials
        KUBECONFIG_CREDENTIALS_ID = "kubeconfig" // Kubernetes kubeconfig credentials
    }

    stages {
        stage('Authenticate with GCP') {
            steps {
                script {
                    withCredentials([file(credentialsId: GCP_SERVICE_ACCOUNT, variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
                        // Authenticate with GCP
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
                // Clone the GitHub repository
                git url: 'https://github.com/akhilsathyan07/nodejs-mongo-app1.git', branch: 'main'
            }
        }

        stage('SonarQube Code Analysis') {
            steps {
                script {
                    // Run SonarQube analysis for the project
                    def scannerHome = tool name: 'sonar-scanner', type: 'hudson.plugins.sonar.SonarRunnerInstallation'
                    withSonarQubeEnv('sonarqube') {
                        sh """
                        ${scannerHome}/bin/sonar-scanner \
                            -Dsonar.projectVersion=1.0-SNAPSHOT \
                            -Dsonar.qualityProfile="Sonar way" \
                            -Dsonar.projectBaseDir=${WORKSPACE} \
                            -Dsonar.projectKey=sonarqube \
                            -Dsonar.sourceEncoding=UTF-8 \
                            -Dsonar.host.url=http://34.45.141.16:9000 \
                            -Dsonar.login="sqp_016a5d378e08410c939f74a883e46214d8946730"
                        """
                    }
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    // Build the Docker image
                    sh """
                    docker build -t ${GCR_HOST}/${IMAGE_NAME}:${BUILD_NUMBER} .
                    """
                }
            }
        }

        stage('Push Docker Image to GCR') {
            steps {
                script {
                    // Push the Docker image to GCR
                    sh """
                    gcloud auth configure-docker ${GCR_HOST}
                    docker push ${GCR_HOST}/${IMAGE_NAME}:${BUILD_NUMBER}
                    """
                }
            }
        }

        stage('Deploy with Helm') {
            steps {
                script {
                    // Use kubeconfig credentials to deploy via Helm
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

