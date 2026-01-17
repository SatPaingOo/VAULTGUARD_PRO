
export default {
  "app_title": "VAULTGUARD_PRO",
  "app_subtitle": "NEURAL_SECURITY_OPS_v1.0",
  "initiate_scan": "INITIATE_SCAN",
  "restart_mission": "RESTART_MISSION",
  "export_pdf": "EXPORT_PDF",
  "target_url_placeholder": "TARGET_URL...",
  "scanning_levels": {
    "fast": "FAST_HYGIENE",
    "standard": "STANDARD_AUDIT",
    "deep": "FORENSIC_DEEP"
  },
  "etas": {
    "fast": "EST: 45s",
    "standard": "EST: 120s",
    "deep": "EST: 300s"
  },
  "token_estimates": {
    "fast": "~8K",
    "standard": "~25K",
    "deep": "~150K+"
  },
  "specs": {
    "detection": ["DETECTION_VECTOR", "LEGACY_SIG", "NEURAL_LOGIC"],
    "grounding": ["GROUNDING", "Static DB (Outdated)", "Google Search Live"],
    "context": ["CONTEXT_WINDOW", "Single Request", "Full DOM Logic Chain"],
    "reasoning": ["REASONING", "Regex/Pattern", "Deductive Thinking"],
    "thinking": ["THINKING_CAPACITY", "0 Tokens", "32,768 Tokens"],
    "chaining": ["VULN_CHAINING", "None (Atomic)", "Multi-Step Chaining"],
    "latency": ["PROCESSING", "Sequential", "Neural Parallel"]
  },
  "level_comparison": {
    "fast": {
      "grounding": ["Static Local DB (Outdated)", "Real-time OSINT Grounding", "Network-Level Accuracy"],
      "context": ["Atomic Request Analysis", "Headers + SSL + DNS Only", "Surface-Level Triage"],
      "reasoning": ["Pattern/Regex Matching", "Basic Neural Analysis", "Fast Detection"],
      "thinking": ["Non-existent", "No Thinking Budget", "Instant Results"],
      "chaining": ["Isolated Vulnerabilities", "Single-Vector Detection", "Basic Hygiene"],
      "latency": ["Sequential Processing", "Parallel Network Streams", "45s Average"]
    },
    "standard": {
      "grounding": ["Static Local DB (Outdated)", "Live CVE Mapping via Search Grounding", "Stack-Wide Accuracy"],
      "context": ["Atomic Request Analysis", "Headers + SSL + DNS + Security Signals", "Comprehensive Triage"],
      "reasoning": ["Pattern/Regex Matching", "Deductive Neural Logic", "Zero False Positives"],
      "thinking": ["Non-existent", "No Thinking Budget", "Fast Analysis"],
      "chaining": ["Isolated Vulnerabilities", "Multi-Vector Detection", "Dependency Mapping"],
      "latency": ["Sequential Processing", "Parallel Neural Streams", "120s Average"]
    },
    "deep": {
      "grounding": ["Static Local DB (Outdated)", "Live CVE Mapping + Full Grounding", "Zero-Day Accuracy"],
      "context": ["Atomic Request Analysis", "Full DOM Logic Chain (50K chars)", "Deep Triage"],
      "reasoning": ["Pattern/Regex Matching", "Heuristic Logic Probing", "Zero False Positives"],
      "thinking": ["Non-existent", "32K Recursive Reasoning (32,768 Tokens)", "Complex Triage"],
      "chaining": ["Isolated Vulnerabilities", "Recursive Attack Chain Simulation", "Killchain Logic"],
      "latency": ["Sequential Processing", "Parallel Neural Streams", "300s Average"]
    }
  },
  "legal": {
    "title": "AUTHORIZATION_PROTOCOL_V1",
    "warning": "UNAUTHORIZED_SCANNING_IS_PROHIBITED",
    "disclaimer": "By initiating a mission, you verify that you have explicit legal authorization to perform security testing on the target domain. VaultGuard Pro operates as a deductive reasoning engine and accepts no liability for misuse.",
    "compliance": "SOC2 / HIPAA / ISO27001 COMPLIANCE READY"
  },
  "level_descriptions": {
    "fast": "Infrastructure audit focusing on DNS, SSL, and Headers. Ideal for rapid baseline posture checks.",
    "standard": "Comprehensive DNA profiling. Cross-references live CVE databases for stack-wide vulnerability mapping.",
    "deep": "Mission-critical forensic audit using 32K token reasoning to simulate multi-stage breach chaining."
  },
  "level_details": {
    "fast": {
      "data_collected": "Headers only, SSL info, DNS records (No DOM analysis)",
      "ai_model": "Gemini 3 Flash (Fast inference)",
      "thinking_budget": "None (Fast mode)",
      "scans": [
        { "test": "Security Headers", "method": "HTTP HEAD request analysis", "accuracy": "95%" },
        { "test": "SSL/TLS Certificate", "method": "SSL Labs API + certificate validation", "accuracy": "90%" },
        { "test": "DNS Records", "method": "Google DNS API lookup", "accuracy": "90%" },
        { "test": "Network Perimeter", "method": "Headers + SSL + DNS analysis", "accuracy": "85%" }
      ]
    },
    "standard": {
      "data_collected": "Headers + SSL + DNS + Security Signals (Lightweight DOM signals, no full DOM)",
      "ai_model": "Gemini 3 Flash (Fast inference)",
      "thinking_budget": "None (Standard mode)",
      "scans": [
        { "test": "All FAST tests", "method": "Same as FAST level", "accuracy": "90-95%" },
        { "test": "Security Signals", "method": "DOM signal extraction (forms, scripts, meta)", "accuracy": "85%" },
        { "test": "Technology DNA", "method": "AI analysis of tech stack + CVE cross-reference", "accuracy": "85%" },
        { "test": "Client-Side Vulnerabilities", "method": "XSS, CSRF, DOM flaws detection", "accuracy": "85%" },
        { "test": "Dependency CVEs", "method": "Live CVE database cross-reference via Search Grounding", "accuracy": "80%" }
      ]
    },
    "deep": {
      "data_collected": "Full data: Headers + SSL + DNS + Signals + Complete DOM (up to 50K chars)",
      "ai_model": "Gemini 3 Pro (Deep reasoning)",
      "thinking_budget": "32,768 tokens (Extended reasoning)",
      "scans": [
        { "test": "All STANDARD tests", "method": "Same as STANDARD level", "accuracy": "85-95%" },
        { "test": "Full DOM Analysis", "method": "Complete HTML structure analysis (up to 50K chars)", "accuracy": "85%" },
        { "test": "Business Logic Flaws", "method": "32K token reasoning to simulate exploit chains", "accuracy": "80%" },
        { "test": "Vulnerability Chaining", "method": "Multi-step attack path simulation", "accuracy": "75%" },
        { "test": "Forensic Deduction", "method": "Deep reasoning about attack surface and logic flows", "accuracy": "80%" }
      ]
    }
  },
  "labels": {
    "progress": "PROGRESS",
    "neural_load": "NEURAL_LOAD",
    "est_compute": "EST_COMPUTE",
    "neural_engine": "NEURAL_ENGINE",
    "telemetry": "TELEMETRY_STREAM",
    "setup_engine": "SETUP_ENGINE",
    "engine_active": "ENGINE_ACTIVE",
    "mission_lifecycle": "MISSION_LIFECYCLE",
    "neural_vs_legacy": "NEURAL_LOGIC vs LEGACY_SIGS",
    "how_it_works": "HOW_IT_WORKS",
    "core_specs": "CORE_SPECS",
    "choose_intensity": "SELECT_MISSION_INTENSITY",
    "command_buffer": "COMMAND_BUFFER",
    "legacy_scanners": "Legacy Scanners",
    "vaultguard_neural": "VaultGuard Neural",
    "setup_guide": "ENGINE_SETUP_MANUAL",
    "sandbox_title": "THE_NEURAL_SANDBOX",
    "sandbox_desc": "HOW AI & SANDBOX WORK TOGETHER",
    "forensic_logs": "FORENSIC_SANDBOX_LOGS",
    "risk_topology": "RISK_TOPOLOGY",
    "deductions": "AI_DEDUCTIONS",
    "capabilities_limitations": "CAPABILITIES & LIMITATIONS",
    "can_test": "CAN TEST",
    "cannot_test": "CANNOT TEST",
    "why": "Why:",
    "why_can_test": "Browser APIs allow access to headers, public APIs provide SSL/DNS data, DOM analysis works for client-side code",
    "why_cannot_test": "Browser security model prevents server-side access, raw network operations, and file system access",
    "ethical_warning": "ETHICAL USE ONLY",
    "who_should_use": "WHO SHOULD USE THIS TOOL:",
    "prohibited_use": "PROHIBITED USE:",
    "legal_notice": "⚠️ Legal Notice: Unauthorized scanning is illegal in many jurisdictions. You must have explicit written permission before testing any system. The tool accepts no liability for misuse. Use responsibly and ethically."
  },
  "sandbox_steps": {
    "s1": ["DOM_ISOLATION", "The engine extracts target signals and isolates them into a local browser-side virtual environment."],
    "s2": ["NEURAL_MASKING", "Sensitive data (keys, emails, tokens) are PII-scrubbed before being processed by the AI Core."],
    "s3": ["HEURISTIC_SIMULATION", "Gemini 3 Pro simulates millions of exploit paths within the sandbox to predict real-world success."],
    "s4": ["LOGIC_VERIFICATION", "Vulnerabilities are double-verified by cross-referencing live CVE databases via Search Grounding."]
  },
  "setup_manual": {
    "req_title": "What you need:",
    "req_1": "Google AI Studio API Key",
    "req_2": "Paid Billing Project (GCP)",
    "req_3": "Access to Gemini 3 Models",
    "step_title": "How to setup:",
    "step_1": "Click the 'SETUP ENGINE' button in the header.",
    "step_2": "Select your API key from your paid project.",
    "step_3": "Verify the 'ENGINE_ACTIVE' green indicator."
  },
  "workflow_stages": {
    "s1": ["01. OSINT_HARVESTING", "Domain Grounding", "Exposing subdomains, open ports, and WHOIS records."],
    "s2": ["02. CVE_CROSS_REFERENCE", "Vulnerability Mapping", "Checking tech stack against live NVD and GitHub advisories."],
    "s3": ["03. HEURISTIC_DNA", "Stack Reconstruction", "Analyzing scripts to identify backend tech and version flaws."],
    "s4": ["04. LOGICAL_CHAINING", "Neural Thinking Mode", "Simulating complex vulnerability chaining and logic breaches."]
  },
  "capabilities": {
    "security_headers": "Security Headers - X-Frame-Options, CSP, HSTS (95% accuracy)",
    "ssl_tls": "SSL/TLS - Certificate validity, SSL grade (90% accuracy)",
    "client_vulns": "Client-Side Vulnerabilities - XSS, CSRF, DOM flaws (85% accuracy)",
    "tech_stack": "Tech Stack - Technology detection (85% accuracy)",
    "dns_info": "DNS Information - IP addresses, DNS records (90% accuracy)"
  },
  "limitations": {
    "sql_injection": "SQL Injection - Can't execute queries (40% accuracy, pattern only)",
    "server_side": "Server-Side Code - No server access (30% accuracy, inference only)",
    "port_scanning": "Port Scanning - No raw TCP/UDP access",
    "file_system": "File System - Browser sandbox restrictions",
    "cors_blocked": "CORS-Blocked APIs - Limited by browser security"
  },
  "who_can_use": {
    "website_owners": "Website Owners - Testing your own websites",
    "authorized_teams": "Authorized Security Teams - With written permission",
    "bug_bounty": "Bug Bounty Researchers - Following responsible disclosure",
    "auditors": "Security Auditors - With client authorization"
  },
  "prohibited": {
    "unauthorized": "Unauthorized Testing - Without explicit permission",
    "malicious": "Malicious Activities - Hacking, data theft, disruption",
    "privacy": "Privacy Violations - Scanning without consent",
    "illegal": "Illegal Access - Breaking into systems you don't own"
  },
  "pdf": {
    "title": "VAULTGUARD PRO",
    "subtitle": "NEURAL_FORENSIC_DEBRIEF_V1.0",
    "target_ident": "TARGET_IDENT",
    "timestamp": "TIMESTAMP",
    "executive_intelligence": "EXECUTIVE INTELLIGENCE",
    "risk_score": "Risk Score",
    "mission_intensity": "Mission Intensity",
    "neural_load": "Neural Load",
    "tokens": "tokens",
    "data_quality_assessment": "DATA QUALITY ASSESSMENT",
    "trust_score": "Trust Score",
    "trust_level": "Trust Level",
    "trust_high": "HIGH",
    "trust_medium": "MEDIUM",
    "trust_low": "LOW",
    "trust_very_low": "VERY LOW",
    "limitations": "LIMITATIONS",
    "forensic_deduction": "FORENSIC_DEDUCTION",
    "no_analysis": "No analysis available.",
    "technology_dna": "TECHNOLOGY_DNA",
    "category": "Category",
    "status": "Status",
    "action": "Action",
    "probe_execution_details": "PROBE_EXECUTION_DETAILS",
    "response_time": "Response Time",
    "vulnerable": "⚠ VULNERABLE",
    "cors_blocked": "⚠ CORS_BLOCKED",
    "description": "Description",
    "vulnerability_ledger": "VULNERABILITY_LEDGER",
    "severity": "Severity",
    "cwe": "CWE",
    "confidence": "Confidence",
    "evidence_sources": "Evidence Sources",
    "no_description": "No description available.",
    "remediation": "REMEDIATION",
    "no_remediation": "No remediation available.",
    "business_impact": "BUSINESS_IMPACT",
    "proof_of_concept": "PROOF_OF_CONCEPT",
    "no_vulnerabilities": "No vulnerabilities detected in neural simulation.",
    "error_generating": "Error generating PDF. Check console for details."
  },
  "results": {
    "data_quality": "DATA_QUALITY",
    "trustworthiness_assessment": "Trustworthiness assessment",
    "high_trust": "HIGH_TRUST",
    "medium_trust": "MEDIUM_TRUST",
    "low_trust": "LOW_TRUST",
    "very_low_trust": "VERY_LOW_TRUST",
    "data_reliability_score": "Data reliability score",
    "limitations": "Limitations",
    "available": "Available",
    "blocked": "Blocked",
    "limited": "Limited",
    "unavailable": "Unavailable",
    "failed": "Failed",
    "executive_intel": "EXECUTIVE_INTEL",
    "forensic_target_reasoning": "Forensic target reasoning and posture",
    "security_score": "SECURITY_SCORE",
    "audit_intensity": "AUDIT_INTENSITY",
    "neural_forensic_deduction": "Neural_Forensic_Deduction",
    "no_telemetry": "No telemetry data available",
    "vulnerability_ledger": "VULNERABILITY_LEDGER",
    "verified_findings": "Verified findings with functional PoC",
    "technology_dna": "TECHNOLOGY_DNA",
    "detected_tech_stack": "Detected tech stack & version hygiene",
    "logic_flow": "Logic_Flow",
    "injections": "Injections",
    "net_hygiene": "Net_Hygiene",
    "config_dna": "Config_DNA",
    "severity_severity": "_SEVERITY",
    "chain_high": "CHAIN: HIGH",
    "proof_of_concept_script": "Proof_of_Concept_Script",
    "remediation_directive": "REMEDIATION_DIRECTIVE",
    "business_impact": "BUSINESS_IMPACT",
    "high_risk_logic": "High risk of logic manipulation.",
    "payload_verification": "# Payload verification simulation complete"
  },
  "webaudit": {
    "mission_active": "MISSION_ACTIVE",
    "progress": "Progress",
    "tactical_dispatcher": "Tactical_Dispatcher",
    "live_mission_telemetry": "Live_Mission_Telemetry",
    "telemetry_log": "Telemetry_Log"
  },
  "virtualhud": {
    "target_reconnaissance": "Target Reconnaissance",
    "neural_threat": "Neural_Threat",
    "neural_blueprint": "Neural_Blueprint",
    "target_reconstruction": "Target reconstruction active",
    "visual": "Visual",
    "geo": "Geo",
    "logic": "Logic"
  },
  "apikey": {
    "hide_token": "Hide Token",
    "show_token": "Show Token",
    "invalid_format": "Invalid format (minimum 20 characters)"
  }
};
