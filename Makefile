PACKAGE_NAME := cunyrefiner
VERSION := $(shell date +%y.%V).$(shell expr $$(git rev-list --count HEAD) + 1)
BUILD_DIR := build
ZIP_FILE := $(BUILD_DIR)/$(PACKAGE_NAME)-v$(VERSION).zip

.PHONY: all zip update-version clean

all: zip

zip: $(ZIP_FILE)

update-version:
	@perl -0pi -e 's/("version"\s*:\s*")[^"]*(")/$${1}$(VERSION)$${2}/' manifest.json

$(ZIP_FILE): update-version
	@mkdir -p $(BUILD_DIR)
	rm -f $(ZIP_FILE)
	git ls-files | grep -v '\(^\|/\)\.' | zip -X $(ZIP_FILE) -@

clean:
	rm -rf $(BUILD_DIR)
