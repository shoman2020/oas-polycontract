ARG GO_VERSION=1.26.11
FROM golang:${GO_VERSION}-alpine

RUN adduser -D -u 10001 app

ENV HOME=/home/app \
    GOPATH=/home/app/go \
    GOCACHE=/home/app/.cache/go-build

WORKDIR /workspace
RUN chown app:app /workspace
COPY --chown=app:app go.mod .
COPY --chown=app:app . .
USER app
RUN go mod download
CMD ["go", "test", "-mod=readonly", "-v", "./..."]

