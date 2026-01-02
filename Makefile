.PHONY: build run test clean docker-build docker-run metrics

# Variables
IMAGE_NAME = aegis-server
PORT = 8080
METRICS_PORT = 9090

# Development
install:
	pip install -r requirements.txt

run:
	export PYTHONPATH=$$PYTHONPATH:$$(pwd)/aegis-server && python3 -m aegis_server.server

test:
	python3 -m unittest discover aegis-server/tests

clean:
	rm -rf logs/ checkpoints/ __pycache__ .pytest_cache
	find . -name "*.pyc" -delete

# Docker
docker-build:
	docker build -t $(IMAGE_NAME) -f aegis-server/Dockerfile .

docker-run:
	docker run -p $(PORT):8080 -p $(METRICS_PORT):9090 \
		-v $$(pwd)/logs:/app/logs \
		-v $$(pwd)/checkpoints:/app/checkpoints \
		$(IMAGE_NAME)

# Observability
metrics:
	@echo "Metrics available at: http://localhost:$(METRICS_PORT)/metrics"
	curl http://localhost:$(METRICS_PORT)/metrics
