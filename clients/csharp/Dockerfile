ARG DOTNET_VERSION=10.0.404
FROM mcr.microsoft.com/dotnet/sdk:${DOTNET_VERSION}

ENV HOME=/home/app \
    DOTNET_CLI_HOME=/home/app/.dotnet \
    NUGET_PACKAGES=/home/app/.nuget/packages \
    DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE=true

WORKDIR /workspace
RUN chown app:app /workspace
COPY --chown=app:app . .
USER app
RUN dotnet restore ContractTests.csproj --locked-mode
CMD ["dotnet", "test", "--no-restore"]

