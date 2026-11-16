ARG GO_VERSION=1.26.11
FROM golang:${GO_VERSION}-alpine

WORKDIR /workspace
COPY go.mod .
RUN go mod download
COPY . .
CMD ["go", "test", "-v", "./..."]
