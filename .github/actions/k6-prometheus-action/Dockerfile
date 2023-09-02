FROM golang:1.20-alpine as xk6
WORKDIR $GOPATH/src/go.k6.io/k6
RUN apk --no-cache add git=~2
RUN CGO_ENABLED=0 go install go.k6.io/xk6/cmd/xk6@latest  \
    && CGO_ENABLED=0 xk6 build \
    --with github.com/grafana/xk6-output-prometheus-remote@latest \
    --output /usr/local/bin/k6

USER 0
COPY entrypoint.sh /entrypoint.sh
COPY slack.js /slack.js

ENTRYPOINT ["/entrypoint.sh"]