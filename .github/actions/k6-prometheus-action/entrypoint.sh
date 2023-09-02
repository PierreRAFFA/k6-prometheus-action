#!/bin/sh

testId="${INPUT_ENVIRONMENT}_$(date --utc +%F_%T)"
echo "##[set-output name=testId;]$(echo ${testId})"
K6_PROMETHEUS_RW_SERVER_URL=${INPUT_PROMETHEUS-REMOTE-WRITE-URL} \
K6_PROMETHEUS_RW_TREND_STATS='p(99),p(95),p(90),max,min,avg,count,sum' \
k6 run \
    -e PROJECT=$INPUT_PROJECT \
    -e ENVIRONMENT=$INPUT_ENVIRONMENT \
    -e TEST_ID=${testId} \
    -e AUTHOR=$INPUT_AUTHOR \
    ${INPUT_RUN-FLAGS} \
    --out xk6-prometheus-rw \
    ${INPUT_SCRIPT-FILEPATH}