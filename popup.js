document.getElementById("check-url").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentUrl = tabs[0]?.url || "";
        const result = analyzePhishingRisk(currentUrl);
        const resultDiv = document.getElementById("result");

        const reasonsHtml = result.reasons.map(reason => `<li>${reason}</li>`).join("");

        resultDiv.innerHTML = `
            <div class="risk-header">
                <span class="risk-badge ${result.level.toLowerCase()}">${result.level} Risk</span>
                <span class="risk-score">Score: ${result.score}</span>
            </div>
            <p class="url-line"><strong>URL:</strong> ${currentUrl}</p>
            <div class="reason-block">
                <strong>Findings</strong>
                <ul>${reasonsHtml}</ul>
            </div>
        `;
    });
});
