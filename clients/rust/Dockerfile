ARG RUST_VERSION=1.100.0
FROM rust:${RUST_VERSION}-bookworm

RUN useradd --system --uid 10001 --create-home app

ENV HOME=/home/app \
    CARGO_HOME=/home/app/.cargo

WORKDIR /workspace
RUN chown app:app /workspace
COPY --chown=app:app . .
USER app
RUN cargo fetch
CMD ["cargo", "test", "--", "--nocapture"]

