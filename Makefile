COMPOSE = docker compose

.PHONY: help up down restart rebuild ps logs seed eval web prune clean urls

help:          ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-10s\033[0m %s\n",$$1,$$2}'

up:            ## Start the backend stack (Kafka, Redis, 4 services, Prometheus, Grafana)
	$(COMPOSE) up -d

down:          ## Stop and remove the stack
	$(COMPOSE) down

restart:       ## Restart all services
	$(COMPOSE) restart

rebuild:       ## Rebuild service images and start
	$(COMPOSE) build && $(COMPOSE) up -d

ps:            ## Show container status
	$(COMPOSE) ps

logs:          ## Tail logs for all services (Ctrl-C to stop)
	$(COMPOSE) logs -f --tail=100

seed:          ## Register a demo user and run the sample contract through the pipeline
	./scripts/seed.sh

eval:          ## Run the RAG evaluation harness against the running stack
	python3 eval/rag_eval.py

web:           ## Start the Next.js frontend in dev mode
	cd web && npm run dev

prune:         ## Reclaim Docker build-cache + dangling-image disk space
	docker builder prune -af && docker image prune -f

clean:         ## Stop the stack and reclaim disk
	$(COMPOSE) down && docker builder prune -af

urls:          ## Print the local URLs
	@echo "App:        http://localhost:3000"
	@echo "Grafana:    http://localhost:3001   (anonymous view; admin/admin to edit)"
	@echo "Prometheus: http://localhost:9090"
	@echo "Kafka UI:   http://localhost:8080"

.DEFAULT_GOAL := help
