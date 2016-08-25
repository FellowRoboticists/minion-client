#!/bin/bash
#
# Use this script to package up the minion-client application and
# deploy it to the client machine.

DEPLOY_DIR=$(cd $(dirname $0) && pwd)

. ${DEPLOY_DIR}/deploy-support-tools/git-support.sh
. ${DEPLOY_DIR}/deploy-support-tools/package-support.sh
. ${DEPLOY_DIR}/deploy-support-tools/remote-support.sh
. ${DEPLOY_DIR}/deploy-support-tools/node-support.sh

verbose_level=3
BRANCH=master
REPO_DIR=${DEPLOY_DIR}/repo
SOURCE_DIR=${DEPLOY_DIR}/source
PACKAGE_DIR=${DEPLOY_DIR}/packages
BASE_DIR=/var/www/minion
RELEASES_DIR=${BASE_DIR}/releases
CURRENT_DIR=${BASE_DIR}/current
REPOSITORY=git@github.com:FellowRoboticists/minion-client.git
NAME=minion-client
NODE_VERSION=v6.1.0
MACHINE=agriman.local

usage() {
  cat <<EOF
  usage $0 options

  This script packages up minion-client and deploys it to the server.

  OPTIONS:
    -b branch  the git branch to deploy (default 'master')
    -h         Display this help message
    -m machine the machine to deploy to (defalt 'agriman.local')
    -n version the version of node to use (default 'v6.1.0')
    -v         Verbose output
EOF
}

createPackage() {
  local packageName=$1

  prepareSource ${REPO_DIR} ${SOURCE_DIR} ${REPOSITORY} ${NAME} ${BRANCH}

  prepareNodeModules ${SOURCE_DIR} ${NAME} ${NODE_VERSION}

  createReleasePackage ${SOURCE_DIR} ${NAME} ${PACKAGE_DIR} ${packageName}
}

# Parse the command line
while getopts :b:hm:n:v OPTION
do
  case $OPTION in
    b)
      BRANCH=${OPTARG}
      ;;
    h)
      usage
      exit 1
      ;;
    m)
      MACHINE=${OPTARG}
      ;;
    n)
      NODE_VERSION=${OPTARG}
      ;;
    v)
      verbose_level=4
      ;;
    ?)
      usage
      exit 1
      ;;
  esac
done

shift "$(($OPTIND-1))"

ACTION=${1:-create}

# Main program
debug "BRANCH       = ${BRANCH}"
debug "ACTION       = ${ACTION}"
debug "MACHINE      = ${MACHINE}"
debug "NODE_VERSION = ${NODE_VERSION}"

packageName=${NAME}-${BRANCH}.tar.bz2

if [ "${ACTION}" == create ]
then
  createPackage ${packageName}
fi

if [ "${ACTION}" == copy ]
then
  if [ ! -f "${PACKAGE_DIR}/${packageName}" ]
  then
    createPackage ${packageName}
  fi

  releaseDir=$(releaseDirectory ${RELEASES_DIR})
  copyReleasePackage ${PACKAGE_DIR} ${packageName} ${MACHINE} ${releaseDir}
fi

if [ "${ACTION}" == deploy ]
then
  startCommandCapture
  queueCommand latestDir="\$(ls -t ${RELEASES_DIR} | tail -1)"
  queueCommand rm -f ${CURRENT_DIR}
  queueCommand cd ${BASE_DIR} \&\& ln -s releases/\${latestDir} current
  queueCommand sudo systemctl restart minion
  queueCommand numDirs="\$(ls ${RELEASES_DIR} | wc -l)"
  queueCommand "if [ \$numDirs -gt 5 ]; then numDel=\$((numDirs-5)); cd ${RELEASES_DIR} \&\& ls -t | tail -\${numDel} | xargs rm -f; fi"
  invokeQueuedCommands ${MACHINE}
  # clearQueuedCommands
fi
