ARG RUST_VERSION=1.100.0
FROM rust:${RUST_VERSION}-bookworm

WORKDIR /workspace
COPY . .
CMD ["cargo", "test", "--", "--nocapture"]
