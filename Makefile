.PHONY: all build build-web build-go install clean

all: build

build-web:
	cd web && npm install && npm run build

build-go:
	CGO_ENABLED=0 go build -ldflags="-s -w" -o bin/config-studio ./cmd/server

build: build-web build-go

install: build
	mkdir -p /usr/local/bin
	install -m 755 bin/config-studio /usr/local/bin/config-studio
	mkdir -p /etc/yaml-configs /opt/config-studio/data
	if [ -d /etc/systemd/system ]; then \
		install -m 644 init/config-studio.service /etc/systemd/system/config-studio.service; \
		systemctl daemon-reload; \
	fi
	if [ -d /etc/init.d ]; then \
		install -m 755 init/config-studio.initd /etc/init.d/config-studio; \
	fi

clean:
	rm -rf bin web/dist web/node_modules
