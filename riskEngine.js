const TRUSTED_BRANDS = [
  "google",
  "microsoft",
  "apple",
  "paypal",
  "amazon",
  "netflix",
  "facebook",
  "meta",
  "instagram",
  "whatsapp",
  "github",
  "dropbox",
  "bank",
  "chase",
  "wellsfargo",
  "binance",
  "coinbase",
  "steam"
];

const SHORTENER_DOMAINS = [
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "ow.ly",
  "buff.ly",
  "rebrand.ly",
  "cutt.ly",
  "shorturl.at",
  "is.gd"
];

const RISKY_TLDS = [
  "zip",
  "mov",
  "click",
  "top",
  "xyz",
  "support",
  "review",
  "country",
  "work",
  "quest",
  "rest"
];

const SUSPICIOUS_WORDS = [
  "verify",
  "verification",
  "urgent",
  "locked",
  "suspended",
  "confirm",
  "password",
  "billing",
  "invoice",
  "wallet",
  "reward",
  "prize",
  "free",
  "security-alert",
  "account-update",
  "unusual-activity"
];

function analyzeUrl(rawUrl, pageSignals = null) {
  const findings = [];
  let url;

  try {
    url = new URL(rawUrl);
  } catch {
    return {
      url: rawUrl,
      score: 100,
      level: "High Risk",
      summary: "This is not a valid URL. Treat it carefully and do not enter personal information.",
      findings: [
        makeFinding("Invalid URL", "high", "The text could not be parsed as a normal web address.", "Ask for the correct link or type the known website address manually.")
      ],
      pageSignals,
      scannedAt: new Date().toISOString()
    };
  }

  const hostname = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();
  const query = url.search.toLowerCase();
  const full = url.href.toLowerCase();
  const labels = hostname.split(".");
  const tld = labels[labels.length - 1] || "";
  let score = 0;

  if (url.protocol !== "https:") {
    score += 20;
    findings.push(makeFinding(
      "Not using HTTPS",
      "medium",
      "The page is not using HTTPS. This can expose information or indicate a less trustworthy page.",
      "Avoid entering passwords, payment details, or private information."
    ));
  }

  if (SHORTENER_DOMAINS.includes(hostname)) {
    score += 22;
    findings.push(makeFinding(
      "URL shortener detected",
      "medium",
      "Shortened links hide the final destination, which makes them harder to trust.",
      "Expand the link or ask the sender for the full website address."
    ));
  }

  if (hostname.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
    score += 28;
    findings.push(makeFinding(
      "IP address used instead of domain",
      "high",
      "Legitimate services usually use recognizable domain names rather than raw IP addresses.",
      "Do not sign in unless you can confirm this is an official internal system."
    ));
  }

  if (labels.length >= 5) {
    score += 16;
    findings.push(makeFinding(
      "Many subdomains",
      "medium",
      "The URL has many domain levels, which can be used to hide the real destination.",
      "Read the domain from right to left and identify the real registered site."
    ));
  }

  if (hostname.includes("-") && hostname.split("-").length >= 3) {
    score += 12;
    findings.push(makeFinding(
      "Hyphen-heavy domain",
      "low",
      "The domain uses multiple hyphens, a common pattern in lookalike or temporary sites.",
      "Compare it with the official domain before trusting the page."
    ));
  }

  if (RISKY_TLDS.includes(tld)) {
    score += 14;
    findings.push(makeFinding(
      "Unusual top-level domain",
      "medium",
      `The domain ends with .${tld}, which deserves extra attention in security reviews.`,
      "Check whether the organization normally uses this domain ending."
    ));
  }

  if (full.length > 120) {
    score += 12;
    findings.push(makeFinding(
      "Very long URL",
      "low",
      "Very long URLs can hide suspicious parameters or redirects.",
      "Avoid clicking from messages. Navigate to the site manually when possible."
    ));
  }

  if ((url.search.match(/&/g) || []).length >= 5) {
    score += 10;
    findings.push(makeFinding(
      "Many tracking or query parameters",
      "low",
      "The link contains many parameters, making it harder to understand where it leads.",
      "Review the base domain first and ignore pressure-based wording."
    ));
  }

  const matchedWords = SUSPICIOUS_WORDS.filter((word) => full.includes(word));
  if (matchedWords.length > 0) {
    score += Math.min(24, matchedWords.length * 8);
    findings.push(makeFinding(
      "Urgency or account-warning wording",
      matchedWords.length >= 2 ? "medium" : "low",
      `The URL contains words often used in social engineering: ${matchedWords.join(", ")}.`,
      "Slow down. Never enter credentials because a message says the situation is urgent."
    ));
  }

  const brandFindings = detectBrandLookalikes(hostname);
  brandFindings.forEach((finding) => {
    score += finding.weight;
    findings.push(finding.publicFinding);
  });

  if (path.includes("@") || hostname.includes("@")) {
    score += 18;
    findings.push(makeFinding(
      "Confusing @ symbol",
      "medium",
      "The @ symbol can confuse users about the real destination.",
      "Check the actual domain carefully before trusting the page."
    ));
  }

  if (pageSignals) {
    if (pageSignals.passwordInputCount > 0 && url.protocol !== "https:") {
      score += 30;
      findings.push(makeFinding(
        "Password field on non-HTTPS page",
        "high",
        "The page appears to ask for a password without HTTPS protection.",
        "Do not enter a password on this page."
      ));
    }

    if (pageSignals.hasLoginSignals && score >= 25) {
      score += 14;
      findings.push(makeFinding(
        "Login page plus URL risk signals",
        "medium",
        "The page appears to involve account access and the URL already has warning signs.",
        "Confirm the website by typing the official address yourself."
      ));
    }

    if (pageSignals.externalLinkCount > 25) {
      score += 8;
      findings.push(makeFinding(
        "Large number of external links",
        "low",
        "The page links out to many different domains, which can complicate trust decisions.",
        "Review links before clicking and avoid downloading unknown files."
      ));
    }
  }

  const normalizedScore = Math.max(0, Math.min(100, score));
  const level = riskLevel(normalizedScore);

  if (findings.length === 0) {
    findings.push(makeFinding(
      "No major warning signs detected",
      "low",
      "PhishGuard did not identify strong URL-based phishing indicators.",
      "Still stay careful with passwords, payment details, and unexpected messages."
    ));
  }

  return {
    url: url.href,
    hostname,
    score: normalizedScore,
    level,
    summary: summaryFor(level, normalizedScore),
    findings,
    pageSignals,
    scannedAt: new Date().toISOString()
  };
}

function detectBrandLookalikes(hostname) {
  const results = [];

  TRUSTED_BRANDS.forEach((brand) => {
    if (hostname.includes(brand) && !hostname.endsWith(`${brand}.com`) && !hostname.endsWith(`${brand}.org`) && !hostname.endsWith(`${brand}.net`)) {
      const suspiciousBrandPattern = hostname.includes(`${brand}-`) || hostname.includes(`-${brand}`) || hostname.includes(`${brand}.`) || hostname.includes(`${brand}login`) || hostname.includes(`${brand}verify`);

      if (suspiciousBrandPattern) {
        results.push({
          weight: 20,
          publicFinding: makeFinding(
            "Possible brand lookalike",
            "medium",
            `The domain includes the brand word "${brand}" but does not look like the normal official domain.`,
            "Do not sign in from this link. Type the official website address yourself."
          )
        });
      }
    }
  });

  return results;
}

function makeFinding(title, severity, explanation, guidance) {
  return {
    title,
    severity,
    explanation,
    guidance
  };
}

function riskLevel(score) {
  if (score >= 70) return "High Risk";
  if (score >= 35) return "Watch Closely";
  return "Low Risk";
}

function summaryFor(level, score) {
  if (level === "High Risk") {
    return `High-risk warning signs found. Score: ${score}/100. Avoid entering personal information.`;
  }

  if (level === "Watch Closely") {
    return `Some warning signs found. Score: ${score}/100. Verify the website before trusting it.`;
  }

  return `No major phishing indicators found. Score: ${score}/100. Stay alert anyway.`;
}

if (typeof module !== "undefined") {
  module.exports = { analyzeUrl };
}
