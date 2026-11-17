ARG MAVEN_VERSION=3.10.0
ARG JAVA_VERSION=25
FROM maven:${MAVEN_VERSION}-eclipse-temurin-${JAVA_VERSION}

RUN useradd --uid 10001 --create-home app

ENV HOME=/home/app

WORKDIR /workspace
RUN chown app:app /workspace
COPY --chown=app:app pom.xml .
COPY --chown=app:app src ./src
USER app
CMD ["mvn", "-B", "clean", "test"]

