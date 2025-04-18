#!/bin/bash
# filepath: gatling/run-tests.sh

# Default simulation if none provided
SIMULATION_NAME=${1:-"BasicSimulation"}

# Run Gatling in Docker
docker run -it --rm \
  -v $(pwd)/gatling/simulations:/opt/gatling/user-files/simulations \
  -v $(pwd)/gatling/resources:/opt/gatling/user-files/resources \
  -v $(pwd)/gatling/results:/opt/gatling/results \
  denvazh/gatling:latest \
  -s $SIMULATION_NAME