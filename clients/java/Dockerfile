ARG MAVEN_VERSION=3.10.1
ARG JAVA_VERSION=25
FROM maven:${MAVEN_VERSION}-eclipse-temurin-${JAVA_VERSION}

RUN useradd --system --uid 10001 --create-home app

ENV HOME=/home/app

WORKDIR /workspace
RUN chown app:app /workspace
COPY --chown=app:app pom.xml .
COPY --chown=app:app src ./src
USER app
CMD ["mvn", "-B", "test"]

