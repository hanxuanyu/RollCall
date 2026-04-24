.PHONY: build-desktop build-server build-all clean

COMMIT_ID := $(shell git rev-parse --short HEAD)
LATEST_TAG := $(shell git describe --tags --abbrev=0 --match "v*" 2>/dev/null || echo "")
TAG_COMMIT := $(shell [ -n "$(LATEST_TAG)" ] && git rev-parse --short "$(LATEST_TAG)" || echo "")
VERSION := $(if $(and $(LATEST_TAG),$(filter $(TAG_COMMIT),$(COMMIT_ID))),$(LATEST_TAG),$(shell git rev-parse --abbrev-ref HEAD))
LDFLAGS := -X RollCall/internal/version.Version=$(VERSION) -X RollCall/internal/version.CommitID=$(COMMIT_ID)

build-desktop:
	wails build -ldflags "$(LDFLAGS)"

build-server: build-frontend
	CGO_ENABLED=0 go build -tags server -ldflags "$(LDFLAGS)" -o build/bin/RollCallServer .

build-frontend:
	cd frontend && npm run build

build-all: build-desktop build-server

clean:
	rm -rf build/bin
