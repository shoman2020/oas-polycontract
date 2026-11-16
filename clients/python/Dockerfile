ARG PYTHON_VERSION=3.15.2
FROM python:${PYTHON_VERSION}-slim

RUN useradd --system --uid 10001 --create-home app

WORKDIR /workspace
RUN chown app:app /workspace
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY --chown=app:app . .
USER app
CMD ["pytest", "-v", "-s"]

