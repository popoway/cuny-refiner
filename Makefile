PACKAGE_NAME := cunyrefiner
VERSION := $(shell sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' manifest.json)
BUILD_DIR := build
ZIP_FILE := $(BUILD_DIR)/$(PACKAGE_NAME)-v$(VERSION).zip

.PHONY: all zip clean

all: zip

zip: $(ZIP_FILE)

$(ZIP_FILE):
	@mkdir -p $(BUILD_DIR)
	rm -f $(ZIP_FILE)
	git ls-files | grep -v '\(^\|/\)\.' | zip -X $(ZIP_FILE) -@

clean:
	rm -rf $(BUILD_DIR)
