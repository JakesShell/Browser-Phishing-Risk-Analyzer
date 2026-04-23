function injectRiskBanner(result) {
    if (document.getElementById("phishing-risk-banner")) {
        return;
    }

    if (result.level === "Low") {
        return;
    }

    const banner = document.createElement("div");
    banner.id = "phishing-risk-banner";

    const backgroundColor = result.level === "High" ? "#991b1b" : "#92400e";

    banner.style.position = "fixed";
    banner.style.top = "16px";
    banner.style.right = "16px";
    banner.style.zIndex = "999999";
    banner.style.maxWidth = "380px";
    banner.style.padding = "16px";
    banner.style.borderRadius = "12px";
    banner.style.background = backgroundColor;
    banner.style.color = "white";
    banner.style.boxShadow = "0 12px 24px rgba(0,0,0,0.2)";
    banner.style.fontFamily = "Arial, sans-serif";
    banner.style.lineHeight = "1.5";

    const reasonsHtml = result.reasons.map(reason => `<li>${reason}</li>`).join("");

    banner.innerHTML = `
        <div style="display:flex; justify-content:space-between; gap:12px; align-items:start;">
            <div>
                <strong style="font-size:16px;">Phishing Risk: ${result.level}</strong>
                <div style="margin-top:8px; font-size:14px;">Score: ${result.score}</div>
                <ul style="margin:10px 0 0 18px; padding:0; font-size:14px;">${reasonsHtml}</ul>
            </div>
            <button id="close-phishing-banner" style="background:transparent; color:white; border:none; font-size:18px; cursor:pointer;">×</button>
        </div>
    `;

    document.body.appendChild(banner);

    document.getElementById("close-phishing-banner").addEventListener("click", () => {
        banner.remove();
    });
}

window.addEventListener("load", () => {
    const result = analyzePhishingRisk(window.location.href);
    injectRiskBanner(result);
});
