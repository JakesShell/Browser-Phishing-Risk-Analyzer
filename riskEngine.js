function analyzePhishingRisk(url) {
    let score = 0;
    const reasons = [];

    if (!url || typeof url !== "string") {
        return {
            score: 0,
            level: "Low",
            reasons: ["No URL available to analyze."]
        };
    }

    let parsedUrl;
    try {
        parsedUrl = new URL(url);
    } catch {
        return {
            score: 7,
            level: "High",
            reasons: ["The URL format appears invalid or intentionally malformed."]
        };
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    const fullUrl = parsedUrl.href.toLowerCase();

    if (parsedUrl.protocol !== "https:") {
        score += 2;
        reasons.push("The page is not using HTTPS.");
    }

    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
        score += 3;
        reasons.push("The domain uses a raw IP address instead of a normal hostname.");
    }

    if (hostname.includes("xn--")) {
        score += 3;
        reasons.push("The domain contains punycode, which can sometimes be used in lookalike phishing domains.");
    }

    if (fullUrl.includes("@")) {
        score += 2;
        reasons.push("The URL contains an @ symbol, which can be used to disguise destinations.");
    }

    const suspiciousTerms = [
        "login",
        "verify",
        "account",
        "secure",
        "update",
        "password",
        "bank",
        "signin",
        "confirm",
        "webscr"
    ];

    const matchedTerms = suspiciousTerms.filter(term => fullUrl.includes(term));
    if (matchedTerms.length > 0) {
        score += Math.min(matchedTerms.length, 3) * 2;
        reasons.push(`The URL contains phishing-associated terms: ${matchedTerms.join(", ")}.`);
    }

    const subdomainCount = hostname.split(".").length;
    if (subdomainCount > 3) {
        score += 1;
        reasons.push("The domain uses multiple subdomain levels, which can sometimes be suspicious.");
    }

    let level = "Low";
    if (score >= 6) {
        level = "High";
    } else if (score >= 3) {
        level = "Medium";
    }

    if (reasons.length === 0) {
        reasons.push("No common phishing indicators were detected in the current URL.");
    }

    return { score, level, reasons };
}
