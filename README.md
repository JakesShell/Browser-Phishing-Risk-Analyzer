# Browser Phishing Risk Analyzer

## Overview

Browser Phishing Risk Analyzer is a browser extension designed to evaluate the active page URL for common phishing indicators and present explainable risk feedback to the user.

This project is positioned as a recruiter-ready and business-facing browser safety utility for safer browsing awareness, phishing education, and defensive user support. It checks URL characteristics, suspicious terms, and other lightweight indicators to estimate whether a page deserves additional caution.

The extension includes:

- URL-Based Risk Analysis
- Popup-Based Review Interface
- In-Page Warning Banner For Higher-Risk Results
- Explainable Risk Reasons

## Real-World Business Use Case

This project maps to realistic defensive security workflows used by:

- Security Awareness Teams
- IT Administrators
- Small Business Support Teams
- Browser Safety Tool Builders
- Cybersecurity Students
- Internal Security Education Programs

A company may need to answer questions such as:

- How can users be warned about suspicious links more clearly?
- How can phishing signals be explained instead of only flagged?
- How can a lightweight browser extension support safer browsing behavior?
- How can defensive browser tooling be demonstrated in a portfolio?

This kind of extension could be used as part of security awareness training, employee browsing safety initiatives, or defensive browser utility prototypes.

## Key Features

- Active URL Analysis
- Risk Scoring
- Low / Medium / High Risk Classification
- Explainable Risk Reasons
- Popup-Based URL Review
- In-Page Warning Banner For Higher-Risk Pages
- Browser Extension Structure Using Manifest V3

## Tech Stack

- JavaScript
- HTML
- CSS
- Browser Extension APIs
- Manifest V3

## Project Structure

```text
Browser-Phishing-Risk-Analyzer/
|-- manifest.json
|-- background.js
|-- riskEngine.js
|-- content.js
|-- popup.html
|-- popup.js
|-- styles.css
|-- README.md
|-- docs/
|   |-- images/
|       |-- phishing-banner-high-risk.png
