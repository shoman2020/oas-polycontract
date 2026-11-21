ARG PYTHON_VERSION=3.15.2
FROM python:${PYTHON_VERSION}-slim

RUN useradd --uid 10001 --create-home app

WORKDIR /workspace
RUN chown app:app /workspace
COPY requirements.lock .
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:${PATH}"
RUN pip install --no-cache-dir --require-hashes -r requirements.lock
COPY --chown=app:app . .
USER app
CMD ["pytest", "-v", "-s"]

