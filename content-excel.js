// Content script for Excel web app on SharePoint
// This script checks if the current page is an Excel web app (check variable appName value for "Excel" on current page)
// If it is, it continuously checks for the value of <div class="ewa-rteLine"></div>
// If the value after trimming leading and trailing whitespace is an 8 digit number, it reenables the right click context menu on the page. 

(function () {
	"use strict";

	const EIGHT_DIGIT_PATTERN = /^\d{8}$/;
	const CHECK_INTERVAL_MS = 300;
	let rightClickReenabled = false;
	let contextMenuHandlerInstalled = false;
	let originalDocumentOnContextMenu = null;
	let originalDocumentElementOnContextMenu = null;
	let originalBodyOnContextMenu = null;

	function allowContextMenu(event) {
		event.stopPropagation();
	}

	function getPageAppName() {
		try {
			if (typeof window.appName === "string") {
				return window.appName;
			}

			if (typeof globalThis.appName === "string") {
				return globalThis.appName;
			}
		} catch (error) {
			return "";
		}

		return "";
	}

	function isExcelWebAppPage() {
		return /excel/i.test(getPageAppName());
	}

	function getTrimmedRteLineValue() {
    // const element = document.querySelector("label#m_excelWebRenderer_ewaCtl_readoutElement1");
		// return element ? element.ariaLabel.split(".")[0].trim() : "";
    const element = window.getSelection().toString();
		return element ? element.trim() : "";
	}

	function reenableRightClick() {
		if (rightClickReenabled) {
			return;
		}

		rightClickReenabled = true;
		if (!contextMenuHandlerInstalled) {
			window.addEventListener("contextmenu", allowContextMenu, true);
			contextMenuHandlerInstalled = true;
		}

		if (originalDocumentElementOnContextMenu === null && document.documentElement) {
			originalDocumentElementOnContextMenu = document.documentElement.oncontextmenu;
		}

		if (originalBodyOnContextMenu === null && document.body) {
			originalBodyOnContextMenu = document.body.oncontextmenu;
		}

		if (originalDocumentOnContextMenu === null) {
			originalDocumentOnContextMenu = document.oncontextmenu;
		}

		if (document.documentElement) {
			document.documentElement.oncontextmenu = null;
			document.documentElement.removeAttribute("oncontextmenu");
		}

		if (document.body) {
			document.body.oncontextmenu = null;
			document.body.removeAttribute("oncontextmenu");
		}

		document.oncontextmenu = null;
	}

	function restoreRightClickBehavior() {
		if (!rightClickReenabled) {
			return;
		}

		rightClickReenabled = false;

		if (contextMenuHandlerInstalled) {
			window.removeEventListener("contextmenu", allowContextMenu, true);
			contextMenuHandlerInstalled = false;
		}

		if (document.documentElement) {
			document.documentElement.oncontextmenu = originalDocumentElementOnContextMenu;
			if (originalDocumentElementOnContextMenu === null) {
				document.documentElement.removeAttribute("oncontextmenu");
			}
		}

		if (document.body) {
			document.body.oncontextmenu = originalBodyOnContextMenu;
			if (originalBodyOnContextMenu === null) {
				document.body.removeAttribute("oncontextmenu");
			}
		}

		document.oncontextmenu = originalDocumentOnContextMenu;
	}

	function checkAndReenableContextMenu() {
		// if (!isExcelWebAppPage()) {
		// 	return;
		// }
    console.log(getTrimmedRteLineValue());

		const value = getTrimmedRteLineValue();
		if (EIGHT_DIGIT_PATTERN.test(value)) {
			reenableRightClick();
		} else {
			restoreRightClickBehavior();
		}
	}

	checkAndReenableContextMenu();
	window.setInterval(checkAndReenableContextMenu, CHECK_INTERVAL_MS);
})();

