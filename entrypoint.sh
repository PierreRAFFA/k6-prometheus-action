#!/bin/sh

testId="${ENVIRONMENT}_$(date --utc +%F_%T)"
echo "##[set-output name=testId;]$(echo ${testId})"
K6_PROMETHEUS_RW_SERVER_URL=$PROMETHEUS_REMOTE_WRITE_URL \
K6_PROMETHEUS_RW_TREND_STATS='p(99),p(95),p(90),max,min,avg,count,sum' \
/usr/local/bin/k6 run \
    -e PROJECT=$PROJECT \
    -e ENVIRONMENT=$ENVIRONMENT \
    -e TEST_ID=${testId} \
    -e AUTHOR=$AUTHOR \
    $RUN_FLAGS \
    --out xk6-prometheus-rw \
    $SCRIPT_FILEPATH \
    $ENV_VARS_FLAG