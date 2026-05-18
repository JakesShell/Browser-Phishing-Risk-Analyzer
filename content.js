function collectPageSignals() {
  const forms = Array.from(document.querySelectorAll("form"));
  const inputs = Array.from(document.querySelectorAll("input"));
  const links = Array.from(document.querySelectorAll("a"));

  const passwordInputs = inputs.filter((input) => {
    return String(input.type || "").toLowerCase() === "password";
  });

  const emailInputs = inputs.filter((input) => {
    const type = String(input.type || "").toLowerCase();
    const name = String(input.name || "").toLowerCase();
    const id = String(input.id || "").toLowerCase();
    return type === "email" || name.includes("email") || id.includes("email");
  });

  const loginWords = [
    "login",
    "log in",
    "sign in",
    "verify",
    "verification",
    "account",
    "password",
    "billing",
    "wallet",
    "security alert",
    "confirm"
  ];

  const visibleText = document.body ? document.body.innerText.slice(0, 6000).toLowerCase() : "";
  const matchedLoginWords = loginWords.filter((word) => visibleText.includes(word));

  const externalLinks = links.filter((link) => {
    try {
      const href = new URL(link.href);
      return href.hostname !== window.location.hostname;
    } catch {
      return false;
    }
  });

  return {
    title: document.title || "",
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    formCount: forms.length,
    inputCount: inputs.length,
    passwordInputCount: passwordInputs.length,
    emailInputCount: emailInputs.length,
    externalLinkCount: externalLinks.length,
    matchedLoginWords,
    hasLoginSignals: passwordInputs.length > 0 || matchedLoginWords.length >= 2,
    collectedAt: new Date().toISOString()
  };
}

function runAutomaticScan() {
  if (typeof analyzeUrl !== "function") {
    return;
  }

  if (!window.location.href || window.location.protocol === "chrome:") {
    return;
  }

  const pageSignals = collectPageSignals();
  const report = analyzeUrl(window.location.href, pageSignals);

  chrome.runtime.sendMessage({
    type: "PHISHGUARD_AUTO_SCAN_RESULT",
    report
  });

  if (report.score >= 35) {
    injectWarningBanner(report);
  } else {
    removeWarningBanner();
  }
}

function injectWarningBanner(report) {
  removeWarningBanner();

  const banner = document.createElement("div");
  banner.id = "phishguard-warning-banner";

  const isHigh = report.level === "High Risk";

  banner.innerHTML = `
    <div class="phishguard-banner-inner">
      <div>
        <strong>${isHigh ? "PhishGuard High Risk Warning" : "PhishGuard Caution"}</strong>
        <p>${escapeHtml(report.summary)}</p>
      </div>
      <button id="phishguard-dismiss-banner" type="button">Dismiss</button>
    </div>
  `;

  const style = document.createElement("style");
  style.id = "phishguard-warning-style";
  style.textContent = `
    #phishguard-warning-banner {
      position: fixed;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2147483647;
      width: min(760px, calc(100vw - 24px));
      color: #f8fafc;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      pointer-events: auto;
    }

    .phishguard-banner-inner {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
      border: 1px solid ${isHigh ? "rgba(248, 113, 113, 0.65)" : "rgba(251, 191, 36, 0.65)"};
      border-radius: 18px;
      padding: 14px 16px;
      background: ${isHigh ? "rgba(127, 29, 29, 0.96)" : "rgba(113, 63, 18, 0.96)"};
      box-shadow: 0 18px 60px rgba(0, 0, 0, 0.38);
      backdrop-filter: blur(16px);
    }

    #phishguard-warning-banner strong {
      display: block;
      margin-bottom: 4px;
      font-size: 14px;
      letter-spacing: 0.01em;
    }

    #phishguard-warning-banner p {
      margin: 0;
      color: rgba(248, 250, 252, 0.86);
      font-size: 13px;
      line-height: 1.4;
    }

    #phishguard-dismiss-banner {
      border: 0;
      border-radius: 999px;
      padding: 9px 12px;
      color: #0f172a;
      background: #f8fafc;
      font-weight: 800;
      cursor: pointer;
      white-space: nowrap;
    }
  `;

  document.documentElement.appendChild(style);
  document.documentElement.appendChild(banner);

  document.getElementById("phishguard-dismiss-banner")?.addEventListener("click", removeWarningBanner);
}

function removeWarningBanner() {
  document.getElementById("phishguard-warning-banner")?.remove();
  document.getElementById("phishguard-warning-style")?.remove();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "PHISHGUARD_COLLECT_PAGE_SIGNALS") {
    sendResponse({
      ok: true,
      pageSignals: collectPageSignals()
    });
  }

  return true;
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", runAutomaticScan);
} else {
  runAutomaticScan();
}

let lastUrl = window.location.href;

setInterval(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    setTimeout(runAutomaticScan, 600);
  }
}, 1200);
