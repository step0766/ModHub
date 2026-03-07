FROM python:3.11-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY app/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY app/server.py .
COPY app/archiver.py .
COPY app/three_mf_parser.py .
COPY app/static ./static
COPY app/templates ./templates

RUN mkdir -p /app/data /app/logs /app/config

EXPOSE 8000
VOLUME ["/app/data", "/app/logs", "/app/config"]
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
