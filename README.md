# k6 Prometheus Action

This GitHub action is responsible to run k6 load tests and send metrics to your Prometheus Remote Write Url.  
The metrics will be available in your Grafana.  
This action will also send a notification to Slack once the load tests done.


## Requirements
- gh (comes natively with Github-hosted runners) + write permissions to setup in the repo settings
- jq

## Event Handlers

For `pull_request` and `push` events, the cancellation is performed for previous runs:  
- which are `in_progress` or `queued` state
- from the same workflow, or from a given list of workflows or from any workflow
- from the same branch
- older than the current run

For `merge_group` event, the cancellation is performed for previous runs:  
- which are `in_progress` or `queued` state
- from the same workflow, or from a given list of workflows or from any workflow
- related to the same PR 
- older than the current run

The cancellation of the previous runs could be required when:
- the merge queue has entries running concurrently  
- the first entry fails and all the next ones will have to run again  
This result in multiple runs executed for the same queued PR.  

## Usage 
Place this job at the beginning of your workflow.  
Once the job running, it will check for all runs related to the same context than the current run and cancel all of them.  

Run Load Test
```yaml
jobs:
  k6-prometheus:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2
      - name: Install k6
        run: |
          CGO_ENABLED=0 go install go.k6.io/xk6/cmd/xk6@latest && \
          CGO_ENABLED=0 xk6 build \
            --with github.com/grafana/xk6-output-prometheus-remote@latest \
            --output /tmp/k6
      - name: Run Load Test
        uses: pierreraffa/k6-prometheus-action@1.0
```