ARG DOTNET_VERSION=10.0.15
FROM mcr.microsoft.com/dotnet/sdk:${DOTNET_VERSION}

WORKDIR /workspace
COPY . .
CMD ["dotnet", "test", "--logger", "console;verbosity=normal"]
