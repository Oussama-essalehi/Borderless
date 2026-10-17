# Borderless — common tasks. Run `make help` for the list.

PYTHON ?= python3
VENV   := .venv
BIN    := $(VENV)/bin

.DEFAULT_GOAL := help

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

# ---------------------------------------------------------------- local setup
$(BIN)/python:
	$(PYTHON) -m venv $(VENV)
	$(BIN)/pip install --upgrade pip

.PHONY: setup
setup: $(BIN)/python ## Create .venv with dbt and pipeline dependencies
	$(BIN)/pip install -r docker/airflow/requirements-dbt.txt

# -------------------------------------------------------------------- airflow
.env:
	@echo "AIRFLOW_UID=$$(id -u)" > .env

.PHONY: airflow-up
airflow-up: .env ## Build the image and start Airflow on http://localhost:8080
	docker compose up -d --build

.PHONY: airflow-down
airflow-down: ## Stop Airflow
	docker compose down

.PHONY: airflow-run
airflow-run: ## Trigger one run of the monthly DAG inside the scheduler container
	docker compose exec airflow-scheduler airflow dags test borderless_monthly
