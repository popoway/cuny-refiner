// Content script for DegreeWorks worksheets pages.
// Adds a "Degree Audit Batch Export" button after the first <h1> that lets the
// user batch-run the audit API for a list of student IDs / degree codes and
// download each JSON response.

(function () {
  "use strict";

  const BUTTON_ID = "cuny-refiner-degree-audit-batch-export";
  const OVERLAY_ID = "cuny-refiner-degree-audit-batch-export-overlay";

  function buildAuditUrl(studentId, degree) {
    const params = new URLSearchParams({
      studentId,
      school: "U",
      degree,
      "is-process-new": "true",
      "audit-type": "AA",
      auditId: "",
      "include-inprogress": "true",
      "include-preregistered": "true",
      "aid-term": "",
    });
    return `https://degreeworks.cuny.edu/Dashboard_qc/api/audit?${params.toString()}`;
  }

  function parseTsv(rawText) {
    const rows = rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [studentId, program] = line.split("\t").map((value) => value.trim());
        // Keep only the part after the dash, e.g. "ACCT-BBA" -> "BBA".
        const degree = program ? program.slice(program.indexOf("-") + 1) : "";
        return { studentId, degree };
      })
      .filter((row) => row.studentId && row.degree && row.degree !== "MIN");

    const rowsByStudent = new Map();
    rows.forEach((row) => {
      if (!rowsByStudent.has(row.studentId)) {
        rowsByStudent.set(row.studentId, []);
      }
      rowsByStudent.get(row.studentId).push(row);
    });

    return Array.from(rowsByStudent.values()).flatMap((studentRows) => {
      if (studentRows.length <= 1) {
        return studentRows;
      }
      const nonBaRows = studentRows.filter((row) => row.degree !== "BA");
      // If every row was "BA", keep just one instead of dropping them all.
      return nonBaRows.length > 0 ? nonBaRows : studentRows.slice(0, 1);
    });
  }

  function downloadJson(filename, content) {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function closeOverlay() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
      overlay.remove();
    }
  }

  function openCsvPrompt() {
    if (document.getElementById(OVERLAY_ID)) {
      return;
    }

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2147483647;" +
      "display:flex;align-items:center;justify-content:center;";

    const dialog = document.createElement("div");
    dialog.style.cssText =
      "background:#fff;padding:16px;border-radius:6px;width:420px;max-width:90vw;" +
      "box-shadow:0 4px 16px rgba(0,0,0,0.3);font-family:sans-serif;";

    const label = document.createElement("label");
    label.textContent = "Query CU_SR_DEG_CHKOUT_STAT from CUNYfirst, then paste TSV (EMPLID<TAB>Acad_Plan per line) below:";
    label.style.cssText = "display:block;margin-bottom:8px;font-size:0.9em;";

    const textarea = document.createElement("textarea");
    textarea.rows = 8;
    textarea.style.cssText = "width:100%;box-sizing:border-box;font-family:monospace;";
    textarea.placeholder = "12345678\tACCT-BBA\n12345678\tECON-BA\n23456789\tPSYCH-BA";

    const status = document.createElement("div");
    status.style.cssText = "margin-top:8px;font-size:0.85em;color:#333;min-height:1.2em;";

    const buttonRow = document.createElement("div");
    buttonRow.style.cssText = "margin-top:12px;text-align:right;";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";
    cancelButton.style.marginRight = "8px";
    cancelButton.addEventListener("click", closeOverlay);

    const runButton = document.createElement("button");
    runButton.type = "button";
    runButton.textContent = "Run Export";
    runButton.addEventListener("click", async () => {
      const rows = parseTsv(textarea.value);
      if (!rows.length) {
        status.textContent = "No valid rows found. Expected format: studentId<TAB>program";
        return;
      }

      runButton.disabled = true;
      cancelButton.disabled = true;

      for (let i = 0; i < rows.length; i += 1) {
        const { studentId, degree } = rows[i];
        status.textContent = `Processing ${i + 1} of ${rows.length}: ${studentId} (${degree})...`;

        try {
          const response = await fetch(buildAuditUrl(studentId, degree));
          const text = await response.text();
          downloadJson(`degree-audit-${studentId}-${degree}.json`, text);
        } catch (error) {
          status.textContent = `Failed for ${studentId} (${degree}): ${error.message}`;
        }
      }

      status.textContent = `Done. Processed ${rows.length} row(s).`;
      runButton.disabled = false;
      cancelButton.disabled = false;
      cancelButton.textContent = "Close";
    });

    buttonRow.appendChild(cancelButton);
    buttonRow.appendChild(runButton);

    dialog.appendChild(label);
    dialog.appendChild(textarea);
    dialog.appendChild(status);
    dialog.appendChild(buttonRow);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    textarea.focus();
  }

  function insertButton(heading) {
    if (document.getElementById(BUTTON_ID)) {
      return;
    }

    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.textContent = "Degree Audit Batch Export";
    button.style.cssText = "display:block;margin:8px 0;";
    button.addEventListener("click", openCsvPrompt);

    heading.insertAdjacentElement("afterend", button);
  }

  function tryInsertButton() {
    const heading = document.querySelector("h1");
    if (heading) {
      insertButton(heading);
      return true;
    }
    return false;
  }

  if (!tryInsertButton()) {
    const observer = new MutationObserver(() => {
      if (tryInsertButton()) {
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
