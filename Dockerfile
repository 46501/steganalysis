FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt requirements-web.txt ./
RUN pip install --no-cache-dir -r requirements.txt -r requirements-web.txt
COPY . .
RUN pip install --no-cache-dir . && useradd --create-home --uid 10001 stegovault && chown -R stegovault:stegovault /app /home/stegovault
USER stegovault
EXPOSE 5000
ENV STEGOVAULT_OFFLINE=1
ENV STEGOVAULT_DB_PATH=/home/stegovault/stegovault.db
# The UI must listen on all interfaces inside a container, so it is token-protected by default:
# `docker logs` shows the generated token; pass -e STEGOVAULT_WEB_TOKEN=<secret> to choose your own.
ENV STEGOVAULT_WEB_TOKEN=auto
CMD ["stegovault", "web", "--skip-banner", "--host", "0.0.0.0"]
