ARG WIREMOCK_VERSION=3.13.2-3
FROM wiremock/wiremock:${WIREMOCK_VERSION}

USER root

# Refresh the base OS packages and remove Pebble, which this HTTP-only demo
# does not use.
RUN DEBIAN_FRONTEND=noninteractive apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get upgrade -y --no-install-recommends \
    && rm -f /usr/bin/pebble \
    && rm -rf /var/lib/apt/lists/*

USER 10001:10001

