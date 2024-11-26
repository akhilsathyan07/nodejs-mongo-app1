pipeline {
    agent any

    environment {
        // Google Cloud Project and GCR Configuration
        PROJECT_ID = "symmetric-ion-441609-t1"
        GCR_HOST = "us-central1-docker.pkg.dev/symmetric-ion-441609-t1/gc-registry07"
        IMAGE_NAME = "nodejs-mongo-app"
        IMAGE_TAG = "${BUILD_NUMBER}"
        
        // Kubernetes Namespace
        KUBE_NAMESPACE = "node-mongo"
        
        // Helm Chart Location
        HELM_CHART_DIR = "node-mongo-chart"

        // Credentials
        GCP_SERVICE_ACCOUNT = "gcp-serv-acc"
        KUBECONFIG_CREDENTIALS_ID = "kubeconfig"

        // Custom Trivy Installation Directory
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
                                -Dsonar.token=$SONAR_TOKEN
                            """
                        }
                    }
                }
            }
        }

        stage('Fetch SonarQube Issues') {
            steps {
                script {
                    withCredentials([string(credentialsId: 'sonar-qube', variable: 'SONAR_AUTH_TOKEN')]) {
                        sh """
                        curl -u ${SONAR_AUTH_TOKEN}: http://34.45.141.16:9000/api/issues/search?componentKeys=sonarqube > sonarqube.json
                        """
                    }
                    archiveArtifacts artifacts: 'sonarqube.json', fingerprint: true
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
                    # Check Trivy version and list Docker images
                    ${TRIVY_INSTALL_DIR}/trivy --version
                    docker images

                    # Run Trivy scan and redirect the output to a JSON file
                    ${TRIVY_INSTALL_DIR}/trivy image --format json ${GCR_HOST}/${IMAGE_NAME}:${BUILD_NUMBER} > trivy_scan_report.json
                    """
                    
                    // Archive the scan report as an artifact in JSON format
                    archiveArtifacts artifacts: 'trivy_scan_report.json', fingerprint: true
                }
            }
        }

        stage('Process SonarQube Issues') {
            steps {
                script {
                    // Parse and format the SonarQube issues into a table format
                    sh """
                    jq -r '.issues[] | [.component, .rule, .severity, .message] | @tsv' sonarqube.json > sonar_issues_table.txt
                    """
                    archiveArtifacts artifacts: 'sonar_issues_table.txt', fingerprint: true
                }
            }
        }

        stage('Process Trivy Scan Report') {
            steps {
                script {
                    // Parse and format Trivy scan JSON output into a tabular format
                    sh """
                    jq -r '.Results[].Vulnerabilities[] | [.PkgName, .VulnerabilityID, .Severity, .InstalledVersion, .FixedVersion] | @tsv' trivy_scan_report.json > trivy_table.txt
                    """
                    archiveArtifacts artifacts: 'trivy_table.txt', fingerprint: true
                }
            }
        }

        stage('Generate Final Output') {
            steps {
                script {
                    // Combine and create the final formatted output
                    sh """
                    echo '--- Trivy Vulnerabilities ---' > pipeline_output.txt
                    column -t -s$'\t' trivy_table.txt >> pipeline_output.txt
                    echo '\n--- SonarQube Issues ---' >> pipeline_output.txt
                    column -t -s$'\t' sonar_issues_table.txt >> pipeline_output.txt
                    """
                    archiveArtifacts artifacts: 'pipeline_output.txt', fingerprint: true
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
        always {
            script {
                def emailSubject
                def emailBody
                def recipientEmail = "akhil.sathyan@urolime.com"

                // Define the email subject and body based on build result
                if (currentBuild.result == "SUCCESS") {
                    emailSubject = "Pipeline Success: ${env.JOB_NAME} - Build #${env.BUILD_NUMBER}"
                    emailBody = """
                    The pipeline run for ${env.JOB_NAME} - Build #${env.BUILD_NUMBER} was successful.
                    Attached is the detailed scan and issue report.
                    """
                } else {
                    emailSubject = "Pipeline Failure: ${env.JOB_NAME} - Build #${env.BUILD_NUMBER}"
                    emailBody = """
                    The pipeline run for ${env.JOB_NAME} - Build #${env.BUILD_NUMBER} has failed.
                    Attached is the detailed scan and issue report.
                    """
                }

                // Send the email with the formatted report
                emailext (
                    subject: emailSubject,
                    body: emailBody,
                    to: recipientEmail,
                    attachLog: true,
                    attachmentsPattern: 'pipeline_output.txt'
                )
            }
        }
    }
}
