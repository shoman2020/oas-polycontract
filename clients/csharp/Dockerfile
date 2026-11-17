ARG DOTNET_VERSION=10.0.15
FROM mcr.microsoft.com/dotnet/sdk:${DOTNET_VERSION}

ENV HOME=/home/app \
    DOTNET_CLI_HOME=/home/app/.dotnet \
    NUGET_PACKAGES=/home/app/.nuget/packages

WORKDIR /workspace
RUN chown app:app /workspace
COPY --chown=app:app . .
USER app
CMD ["dotnet", "test"]

