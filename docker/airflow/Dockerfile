ARG AIRFLOW_VERSION=3.3.2
ARG PYTHON_VERSION=3.12
FROM apache/airflow:${AIRFLOW_VERSION}-python${PYTHON_VERSION}

ARG AIRFLOW_VERSION

# dbt gets its own virtualenv so its pins never conflict with Airflow's.
# Cosmos calls it through ExecutionConfig(dbt_executable_path=/opt/dbt-venv/bin/dbt).
USER root
COPY docker/airflow/requirements-dbt.txt /tmp/requirements-dbt.txt
RUN python -m venv /opt/dbt-venv \
    && /opt/dbt-venv/bin/pip install --no-cache-dir -r /tmp/requirements-dbt.txt \
    && chown -R airflow:0 /opt/dbt-venv

# Airflow-side libraries: Cosmos plus what the pipeline tasks import.
USER airflow
COPY docker/airflow/requirements-airflow.txt /tmp/requirements-airflow.txt
RUN pip install --no-cache-dir "apache-airflow==${AIRFLOW_VERSION}" -r /tmp/requirements-airflow.txt
