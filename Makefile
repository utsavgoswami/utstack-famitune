# Run: make view
# Opens the @famitune/web glossary app in the browser and serves it.
# Stop with Ctrl+C.

.PHONY: view
view:
	npx nx serve web --open
