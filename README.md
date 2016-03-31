# HansonCog 

[![Build Status](http://61.92.69.43:8080/buildStatus/icon?job=ci-hansoncog)](http://61.92.69.43:8080/job/ci-hansoncog/)

This repository contains the integrated code for controlling and
interacting with many Hanson Robotics robot heads. It includes the
full performance pipeline and infrastructure:

* Face detection, for seeing faces in the room.
* Blender robot model, for gracefully controlling facial expressions.
* Behavior tree, for scripting performaces.
* Motor control ROS nodes, for controlling the physical robot.

## Prerequisites

 * ** Only Ubuntu 14.04 supported **

## Install and Setup

Go to scripts directory

`cd scripts`

### Install Dependencies

`./hrtool -i`

### Build

- rebuilds HR workspace

   `./hrtool -b`

- rebuilds HR workspace and OpenCog

    `./hrtool -B`

### Run

- `./dev.sh` to launch ros nodes and webui

### Run Tests

- `./test.sh`

### Web Browser

- HTTP: http://127.0.0.1:8000/
- HTTPS: https://127.0.0.1:4000/

