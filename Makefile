.PHONY: build-desktop build-server build-all clean

build-desktop:
	wails build

build-server: build-frontend
	CGO_ENABLED=0 go build -tags server -o build/bin/RollCallServer .

build-frontend:
	cd frontend && npm run build

build-all: build-desktop build-server

clean:
	rm -rf build/bin
