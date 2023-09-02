import https from 'https';
import { readFileSync, existsSync } from 'fs';

const {
  project: PROJECT,
  environment: ENVIRONMENT,
  testId: TEST_ID,
  author: AUTHOR,
  slackChannel: SLACK_CHANNEL,
  slackToken: SLACK_TOKEN,
  grafanaDashboardUrl: GRAFANA_DASHBOARD_URL } = getArgs()

const summary = readSummary('summary.json')
if (summary) {
  const notification = buildNotification(summary)
  sendNotification(notification)
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function getArgs() {
  const args = process.argv.slice(2);
  const project = args[0]
  const environment = args[1]
  const testId = args[2]
  const author = args[3]
  const slackChannel = args[4]
  const slackToken = args[5]
  return { project, environment, testId, author, slackChannel, slackToken }
}

//////////////
// READ SUMMARY
//////////////
function readSummary(summaryFilepath) {
  let data;
  if (existsSync(summaryFilepath)) {
    try {
      const jsonData = readFileSync(summaryFilepath, 'utf8');
      data = JSON.parse(jsonData);
    } catch (error) {
      console.error('Error reading or parsing JSON file:', error);
    }
  }else{
    console.error('No summary.json found. It could happen if the test failed to run')
  }
  return data
}

//////////////
// BUILD NOTIFICATION
//////////////
function buildNotification(summary) {
  const { status, thresholds, checks } = formatTestStatus(summary)

  const avg = Math.round(summary.metrics.http_req_duration.values['avg'])
  const p90 = Math.round(summary.metrics.http_req_duration.values['p(90)'])
  const p95 = Math.round(summary.metrics.http_req_duration.values['p(95)'])
  const p99 = Math.round(summary.metrics.http_req_duration.values['p(99)'])

  const durationMinutes = Math.round((summary.state.testRunDurationMs / 1000) / 60);

  const delay = 15000
  const padding = 30000
  const stopTimestamp = Date.now() + (delay + padding)
  const startTimestamp = stopTimestamp - Math.round(summary.state.testRunDurationMs) - (delay + padding)

  const vusMax = summary.metrics.vus_max.values.max

  // Create the payload for the Slack message
  return {
    channel: SLACK_CHANNEL,
    attachments: [
      {
        color: "#6945FE",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text:
                `*Project:* ${PROJECT}\n` +
                `*Environment:* ${ENVIRONMENT}\n` +
                `*TestId:* ${TEST_ID}\n` +
                `*Duration:* ${durationMinutes}m (max VUS: ${vusMax})\n` +
                `*Author:* ${AUTHOR}`
            },
          },
          {
            type: "divider",
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: status
            }
          },
          {
            type: "divider",
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text:
                `*Thresholds:*\n${thresholds}`
            }
          },
          {
            type: "divider",
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text:
                `*Checks:*\n${checks}`
            }
          },
          {
            type: "divider",
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*Response Time:*"
            },
            fields: [
              {
                type: "mrkdwn",
                text: `${getResponseTimeColor(avg)} *avg:* ` + avg + "ms",
              },
              {
                type: "mrkdwn",
                text: `${getResponseTimeColor(p99)} *p99:* ` + p99 + "ms",
              },
              {
                type: "mrkdwn",
                text: `${getResponseTimeColor(p95)} *p95:* ` + p95 + "ms",
              },
              {
                type: "mrkdwn",
                text: `${getResponseTimeColor(p90)} *p90:* ` + p90 + "ms",
              },
            ],
          },
          {
            type: "divider",
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `View the Performance Test:\n${grafanaDashboardUrl}&from=${startTimestamp}&to=${stopTimestamp}&var-test_id=${TEST_ID}&var-type=All`,
            },
          },
        ],
      },
    ],
  };
}

//////////////
// SEND NOTIFICATION
//////////////
function sendNotification(notification) {
  const options = {
    hostname: 'slack.com',
    path: '/api/chat.postMessage',
    method: 'POST',
    headers: {
      'Content-Type': "application/json",
      Authorization: "Bearer " + SLACK_TOKEN,
    }
  };

  const req = https.request(options)
  req.on('error', (error) => {
    console.error(error);
  });
  req.write(JSON.stringify(notification));
  req.end();
}

//////////////
// UTILS
//////////////
function formatTestStatus(data) {
  let status = ":white_check_mark: Passed"

  // Thresholds
  let thresholds = ""
  const aggregrationRegex = /(.*)(>|>=|<|<=)+/
  for (let kMetric in data.metrics) {
    const metric = data.metrics[kMetric]
    if ("thresholds" in metric) {
      for (let kThreshold in metric["thresholds"]) {
        if (metric["thresholds"][kThreshold].ok == false) {
          status = ":x: Failed by threshold"
        }
        const color = getStatusColor(metric["thresholds"][kThreshold].ok)

        const aggregationMatches = kThreshold.match(aggregrationRegex);
        if (aggregationMatches.length > 1) {
          const aggregation = aggregationMatches[1].trim();
          const aggregationValue = Math.round(metric.values[aggregation])
          thresholds += `${color} *${kMetric}:${kThreshold}*, got *${aggregation}=${aggregationValue}*\n`
        }
      }
    }
  }

  // Checks
  const checks = data.root_group.checks.reduce((result, check) => {
    const successRate = roundToTwo(check.passes / (check.passes + check.fails) * 100)
    return result + `${getStatusColor(check.fails == 0)} *${check.name}:* ${successRate}%\n`
  }, "");

  return { status, thresholds, checks }
}

function getStatusColor(ok) {
  return ok ? ":large_green_square:" : ":large_red_square:"
}

function getResponseTimeColor(responseTime) {
  if (responseTime < 250) {
    return ":large_green_square:"
  } else if (responseTime < 500) {
    return ":large_orange_square:"
  } else {
    return ":large_red_square:"
  }
}

// To round to 2 decimals only if needed
function roundToTwo(num) {
  return +(Math.round(num + "e+2") + "e-2");
}