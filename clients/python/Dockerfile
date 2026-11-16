ARG PYTHON_VERSION=3.15.2
FROM python:${PYTHON_VERSION}-slim

WORKDIR /workspace
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["pytest", "-v", "-s"]
