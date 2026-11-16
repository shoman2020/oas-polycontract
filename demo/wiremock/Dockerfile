FROM wiremock/wiremock:3.13.2-2

USER root

# Refresh the base OS packages and remove Pebble, which this HTTP-only demo
# does not use.
RUN apt-get update \
    && apt-get upgrade -y --no-install-recommends \
    && rm -f /usr/bin/pebble \
    && rm -rf /var/lib/apt/lists/*

USER 10001:10001
