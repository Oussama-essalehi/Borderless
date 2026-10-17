# Borderless — common tasks. Run `make help` for the list.

PYTHON ?= python3
VENV   := .venv
BIN    := $(VENV)/bin
STAMP  := $(VENV)/.installed

.DEFAULT_GOAL := help

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

# ---------------------------------------------------------------- local setup
$(STAMP): docker/airflow/requirements-dbt.txt pipeline/pyproject.toml
	$(PYTHON) -m venv $(VENV)
	$(BIN)/pip install --upgrade pip
	$(BIN)/pip install -r docker/airflow/requirements-dbt.txt -e "pipeline[dev]"
	touch $@

.PHONY: setup
setup: $(STAMP) ## Create .venv with dbt and the pipeline package

# ------------------------------------------------------------------- pipeline
.PHONY: data
data: $(STAMP) ## Run the whole pipeline without Airflow
	$(BIN)/python -m borderless_pipeline all

.PHONY: data-refresh
data-refresh: $(STAMP) ## Same as `data`, ignoring the raw download cache
	$(BIN)/python -m borderless_pipeline all --force

.PHONY: test
test: $(STAMP) ## Run the Python test suite
	$(BIN)/pytest pipeline

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
airflow-run: ## Run the monthly DAG once inside the scheduler container
	docker compose exec airflow-scheduler airflow dags test borderless_monthly
