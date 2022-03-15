@Library('magento-saas-pipeline@0.8.5') _

def releaseInfo = [ version: '0' ]

pipeline{
    agent{
        label "worker"
    }
    parameters {
        text(name: 'GIT_BRANCH', defaultValue: 'develop', description: 'What is the branch you want to run against?')
    }
    environment {
        HOME = "$WORKSPACE"
        TMPDIR = "$WORKSPACE"
        DEVELOP_BRANCH = 'develop'
        GIT_REPO = 'git@github.com:adobe/aio-cli-plugin-commerce-admin.git'
        CHECKOUTBRANCH = "${env.BRANCH_NAME == 'master' ? env.DEVELOP_BRANCH : params.GIT_BRANCH}"
    }
    stages{
        stage("Build Application"){
            agent {
                docker {
                    image 'node-aws:16-01'
                    args  '-v /etc/passwd:/etc/passwd'
                    registryUrl 'http://docker-docker-cgateway-jenkins-node-dev.dr-uw2.adobeitc.com'
                    registryCredentialsId 'artifactory-cgateway'
                    reuseNode true
                }
            }
            stages {
                stage('Install') {
                    steps {
                        sh 'npm config set registry https://registry.npmjs.org/'
                        sh 'npm install'
                    }
                }
                stage('Test') {
                    steps {
                        sh 'npm run test'
                    }
                }
            }
        }
    }
    post{
        always{
            cleanWs()
        }
        // success {
        //     slackSend channel: "#graphql-gw-devops-qa", color: "good", message: "Job: ${env.JOB_NAME} with buildnumber ${env.BUILD_NUMBER} was successful."
        // }
        // failure {
        //     slackSend channel: "#graphql-gw-devops-qa", color: "danger", message: "Job: ${env.JOB_NAME} with buildnumber ${env.BUILD_NUMBER} failed."
        // }
    }
}
