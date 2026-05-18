let latestReport = null;

const elements = {
  scoreOrb: document.getElementById("scoreOrb"),
  scoreValue: document.getElementById("scoreValue"),
  levelValue: document.getElementById("levelValue"),
  summaryCard: document.getElementById("summaryCard"),
  findingsList: document.getElementById("findingsList"),
  findingCount: document.getElementById("findingCount"),
  pageSignals: document.getElementById("pageSignals"),
  historyList: document.getElementById("historyList"),
  manualUrl: document.getElementById("manualUrl")
};

document.getElementById("scanCurrentTab").addEventListener("click", scanCurrentTab);
document.getElementById("scanManual").addEventListener("click", scanManualUrl);
document.getElementById("exportReport").addEventListener("click", exportReport);
document.getElementById("clearHistory").addEventListener("click", clearHistory);

elements.manualUrl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    scanManualUrl();
  }
});

async function loadLatestTabReport() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: "PHISHGUARD_GET_TAB_REPORT",
      tabId: tab.id
    });

    if (response?.report) {
      renderReport(response.report, false);
    }
  } catch {
    // Ignore. Manual scan still works.
  }
}

async function scanCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.url) {
    renderError("No active tab URL found.");
    return;
  }

  let pageSignals = null;

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "PHISHGUARD_COLLECT_PAGE_SIGNALS"
    });

    pageSignals = response?.pageSignals || null;
  } catch {
    pageSignals = {
      title: tab.title || "",
      hostname: safeHostname(tab.url),
      protocol: "",
      formCount: 0,
      inputCount: 0,
      passwordInputCount: 0,
      emailInputCount: 0,
      externalLinkCount: 0,
      matchedLoginWords: [],
      hasLoginSignals: false,
      collectedAt: new Date().toISOString(),
      note: "Page signals unavailable on this browser page."
    };
  }

  const report = analyzeUrl(tab.url, pageSignals);
  renderReport(report, true);
  saveHistory(report);
}

function scanManualUrl() {
  const value = elements.manualUrl.value.trim();

  if (!value) {
    renderError("Paste a URL first.");
    return;
  }

  const report = analyzeUrl(value, null);
  renderReport(report, true);
  saveHistory(report);
}

function renderReport(report, showSavedLabel = false) {
  latestReport = report;

  elements.scoreValue.textContent = report.score;
  elements.levelValue.textContent = report.level;
  elements.scoreOrb.className = `score-orb ${riskClass(report.level)}`;

  elements.summaryCard.innerHTML = `
    <strong>${escapeHtml(report.hostname || "Manual scan")}</strong>
    <p>${escapeHtml(report.summary)}</p>
    <small>${showSavedLabel ? "Manual scan result" : "Automatic scan result"} • ${escapeHtml(report.url)}</small>
  `;

  elements.findingCount.textContent = report.findings.length;

  elements.findingsList.innerHTML = report.findings.map((finding) => `
    <article class="finding-card ${finding.severity}">
      <div>
        <span>${escapeHtml(finding.severity)}</span>
        <strong>${escapeHtml(finding.title)}</strong>
      </div>
      <p>${escapeHtml(finding.explanation)}</p>
      <small>${escapeHtml(finding.guidance)}</small>
    </article>
  `).join("");

  renderSignals(report.pageSignals);
}

function renderSignals(signals) {
  if (!signals) {
    elements.pageSignals.innerHTML = `
      <article>
        <span>Mode</span>
        <strong>Manual URL scan</strong>
      </article>
    `;
    return;
  }

  const items = [
    ["Title", signals.title || "Unknown"],
    ["Forms", signals.formCount ?? 0],
    ["Password Inputs", signals.passwordInputCount ?? 0],
    ["Email Inputs", signals.emailInputCount ?? 0],
    ["External Links", signals.externalLinkCount ?? 0],
    ["Login Signals", signals.hasLoginSignals ? "Yes" : "No"]
  ];

  elements.pageSignals.innerHTML = items.map(([label, value]) => `
    <article>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `).join("");
}

async function saveHistory(report) {
  const stored = await chrome.storage.local.get(["scanHistory"]);
  const history = Array.isArray(stored.scanHistory) ? stored.scanHistory : [];

  const compact = {
    url: report.url,
    hostname: report.hostname,
    score: report.score,
    level: report.level,
    scannedAt: report.scannedAt
  };

  history.unshift(compact);

  await chrome.storage.local.set({
    scanHistory: history.slice(0, 12)
  });

  renderHistory();
}

async function renderHistory() {
  const stored = await chrome.storage.local.get(["scanHistory"]);
  const history = Array.isArray(stored.scanHistory) ? stored.scanHistory : [];

  if (!history.length) {
    elements.historyList.innerHTML = `<p class="empty-text">No scans yet.</p>`;
    return;
  }

  elements.historyList.innerHTML = history.map((item) => `
    <article class="history-item">
      <div>
        <strong>${escapeHtml(item.hostname || item.url)}</strong>
        <small>${new Date(item.scannedAt).toLocaleString()}</small>
      </div>
      <span class="${riskClass(item.level)}">${escapeHtml(item.score)}</span>
    </article>
  `).join("");
}

async function clearHistory() {
  await chrome.runtime.sendMessage({ type: "PHISHGUARD_CLEAR_HISTORY" });
  renderHistory();
}

function exportReport() {
  if (!latestReport) {
    renderError("Run a scan before exporting a report.");
    return;
  }

  const blob = new Blob([JSON.stringify(latestReport, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `phishguard-report-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function renderError(message) {
  elements.summaryCard.innerHTML = `<p class="error-text">${escapeHtml(message)}</p>`;
}

function riskClass(level) {
  if (level === "High Risk") return "high";
  if (level === "Watch Closely") return "watch";
  return "low";
}

function safeHostname(rawUrl) {
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return "Unknown";
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

renderHistory();
loadLatestTabReport();
