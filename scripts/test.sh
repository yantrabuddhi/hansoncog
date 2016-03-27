#!/usr/bin/env bash
#
# test.sh
#
# Run all the tests
#

BASEDIR=$(dirname $(readlink -f ${BASH_SOURCE[0]}))
PROJECT=hansoncog

eval $($BASEDIR/hrtool -p|grep -E ^HR_WORKSPACE=)
source /opt/ros/indigo/setup.bash
source $HR_WORKSPACE/$PROJECT/devel/setup.bash

export ROS_MASTER_URI=http://localhost:22422
export ROS_PYTHON_LOG_CONFIG_FILE="$BASEDIR/python_logging.conf"
export ROSCONSOLE_FORMAT='[${logger}][${severity}] [${time}]: ${message}'

cd $HR_WORKSPACE/$PROJECT
rostest pi_face_tracker test_pi_face_tracker.test
python src/hardware/pau2motors/test/test_pau2motors.py
cd $HR_WORKSPACE
