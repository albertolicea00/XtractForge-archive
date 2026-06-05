.PHONY: install dev build package-mac package-win package-linux package-all clean git-commit help

# Default target
help:
	@echo "XtractForge Make Commands:"
	@echo "  make install         - Install all project dependencies"
	@echo "  make dev             - Start Electron and Vite dev server with HMR"
	@echo "  make build           - Build the React production assets"
	@echo "  make package-mac     - Package the app for macOS"
	@echo "  make package-win     - Package the app for Windows"
	@echo "  make package-linux   - Package the app for Linux"
	@echo "  make package-all     - Package the app for all platforms"
	@echo "  make clean           - Remove build directories and node_modules"
	@echo "  make git-commit      - Stage all changes and make initial commit"

install:
	npm install

dev:
	npm run dev

build:
	npm run build

package-mac:
	npm run package:mac

package-win:
	npm run package:win

package-linux:
	npm run package:linux

package-all:
	npm run package:all

clean:
	rm -rf dist dist-package node_modules package-lock.json

git-commit:
	git add .
	git commit -m "Initialize XtractForge yt-dlp GUI (Electron + React)"
