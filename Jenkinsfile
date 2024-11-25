pstage('SonarQube Code Analysis') {
    steps {
        script {
            // Run SonarQube analysis for the project
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
                        -Dsonar.scm.provider=git
                    """
                }
            }
        }
    }
}
