FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app

WORKDIR /app/Backend

COPY requirements.txt /app/Backend/requirements.txt
RUN python -m pip install -r requirements.txt

COPY . /app/Backend/
RUN adduser --system --group --no-create-home mybooks \
    && chown -R mybooks:mybooks /app

USER mybooks
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python manage.py shell -c "from django.db import connection; connection.ensure_connection()" || exit 1

CMD ["sh", "-c", "python manage.py collectstatic --noinput && exec gunicorn config.wsgi:application --bind=0.0.0.0:8000 --workers=3 --access-logfile=- --error-logfile=-"]
