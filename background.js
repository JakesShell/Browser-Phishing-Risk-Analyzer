chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    phishGuardInstalledAt: new Date().toISOString(),
    scanHistory: [],
    latestTabReports: {}
  });

  chrome.action.setBadgeText({ text: "" });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "PHISHGUARD_CLEAR_HISTORY") {
    chrome.storage.local.set({ scanHistory: [] }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message?.type === "PHISHGUARD_AUTO_SCAN_RESULT") {
    const tabId = sender?.tab?.id;
    const report = message.report;

    if (tabId && report) {
      updateBadge(tabId, report);

      chrome.storage.local.get(["latestTabReports"], (stored) => {
        const latestTabReports = stored.latestTabReports || {};
        latestTabReports[String(tabId)] = {
          ...report,
          savedAt: new Date().toISOString()
        };

        chrome.storage.local.set({ latestTabReports }, () => {
          sendResponse({ ok: true });
        });
      });

      return true;
    }

    sendResponse({ ok: false });
    return false;
  }

  if (message?.type === "PHISHGUARD_GET_TAB_REPORT") {
    const tabId = message.tabId;

    chrome.storage.local.get(["latestTabReports"], (stored) => {
      const latestTabReports = stored.latestTabReports || {};
      sendResponse({
        ok: true,
        report: latestTabReports[String(tabId)] || null
      });
    });

    return true;
  }

  return false;
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  chrome.storage.local.get(["latestTabReports"], (stored) => {
    const latestTabReports = stored.latestTabReports || {};
    const report = latestTabReports[String(activeInfo.tabId)];

    if (report) {
      updateBadge(activeInfo.tabId, report);
    } else {
      chrome.action.setBadgeText({ tabId: activeInfo.tabId, text: "" });
    }
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.get(["latestTabReports"], (stored) => {
    const latestTabReports = stored.latestTabReports || {};
    delete latestTabReports[String(tabId)];
    chrome.storage.local.set({ latestTabReports });
  });
});

function updateBadge(tabId, report) {
  if (!report || typeof report.score !== "number") {
    chrome.action.setBadgeText({ tabId, text: "" });
    return;
  }

  let text = "OK";
  let color = "#22c55e";

  if (report.level === "Watch Closely") {
    text = "!";
    color = "#f59e0b";
  }

  if (report.level === "High Risk") {
    text = "!!";
    color = "#ef4444";
  }

  chrome.action.setBadgeText({ tabId, text });
  chrome.action.setBadgeBackgroundColor({ tabId, color });
}
