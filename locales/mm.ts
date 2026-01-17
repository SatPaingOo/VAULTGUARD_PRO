
export default {
  "app_title": "VAULTGUARD_PRO",
  "app_subtitle": "အဆင့်မြင့် နျူရယ် လုံခြုံရေး စစ်ဆေးမှုစနစ် v1.0",
  "initiate_scan": "စစ်ဆေးမှု စတင်ရန်",
  "restart_mission": "အသစ်ပြန်စရန်",
  "export_pdf": "PDF ထုတ်ယူရန်",
  "target_url_placeholder": "စစ်ဆေးမည့် URL...",
  "scanning_levels": {
    "fast": "အခြေခံ စစ်ဆေးမှု",
    "standard": "ပုံမှန် စစ်ဆေးမှု",
    "deep": "အသေးစိတ် စစ်ဆေးမှု"
  },
  "etas": {
    "fast": "ကြာချိန်: ၄၅စက္ကန့်",
    "standard": "ကြာချိန်: ၁၂၀စက္ကန့်",
    "deep": "ကြာချိန်: ၃၀၀စက္ကန့်"
  },
  "token_estimates": {
    "fast": "~၈ထောင်",
    "standard": "~၂သောင်းခွဲ",
    "deep": "~၁သိန်းခွဲကျော်"
  },
  "specs": {
    "detection": ["စစ်ဆေးမှု အမျိုးအစား", "ရိုးရိုး စကင်နာ", "နျူရယ် Logic"],
    "grounding": ["GROUNDING", "အဟောင်းများသာ (Database)", "တိုက်ရိုက်ရှာဖွေမှု (Live)"],
    "context": ["CONTEXT_WINDOW", "တစ်ကြိမ်ချင်းသာ", "DOM အားလုံးကို ချိတ်ဆက်မှု"],
    "reasoning": ["REASONING", "ပုံသေစနစ် (Regex)", "ဆင်ခြင်တုံတရားစနစ်"],
    "thinking": ["THINKING_CAPACITY", "0 Tokens", "32,768 Tokens"],
    "chaining": ["VULN_CHAINING", "မရှိပါ", "အဆင့်ဆင့် ချိတ်ဆက်မှု"],
    "latency": ["လုပ်ဆောင်မှု", "တစ်ခုချင်းစီ", "AI အပြိုင်စနစ်"]
  },
  "level_comparison": {
    "fast": {
      "grounding": ["Static Local DB (အဟောင်း)", "Real-time OSINT Grounding", "Network-Level တိကျမှု"],
      "context": ["Atomic Request Analysis", "Headers + SSL + DNS သာ", "Surface-Level Triage"],
      "reasoning": ["Pattern/Regex Matching", "Basic Neural Analysis", "မြန်ဆန်သော Detection"],
      "thinking": ["မရှိပါ", "No Thinking Budget", "ချက်ချင်း Results"],
      "chaining": ["Isolated Vulnerabilities", "Single-Vector Detection", "အခြေခံ Hygiene"],
      "latency": ["Sequential Processing", "Parallel Network Streams", "၄၅စက္ကန့် ပျမ်းမျှ"]
    },
    "standard": {
      "grounding": ["Static Local DB (အဟောင်း)", "Live CVE Mapping via Search Grounding", "Stack-Wide တိကျမှု"],
      "context": ["Atomic Request Analysis", "Headers + SSL + DNS + Security Signals", "ပြည့်စုံသော Triage"],
      "reasoning": ["Pattern/Regex Matching", "Deductive Neural Logic", "Zero False Positives"],
      "thinking": ["မရှိပါ", "No Thinking Budget", "မြန်ဆန်သော Analysis"],
      "chaining": ["Isolated Vulnerabilities", "Multi-Vector Detection", "Dependency Mapping"],
      "latency": ["Sequential Processing", "Parallel Neural Streams", "၁၂၀စက္ကန့် ပျမ်းမျှ"]
    },
    "deep": {
      "grounding": ["Static Local DB (အဟောင်း)", "Live CVE Mapping + Full Grounding", "Zero-Day တိကျမှု"],
      "context": ["Atomic Request Analysis", "Full DOM Logic Chain (50K chars)", "အနက်ရှိုင်းသော Triage"],
      "reasoning": ["Pattern/Regex Matching", "Heuristic Logic Probing", "Zero False Positives"],
      "thinking": ["မရှိပါ", "32K Recursive Reasoning (32,768 Tokens)", "ရှုပ်ထွေးသော Triage"],
      "chaining": ["Isolated Vulnerabilities", "Recursive Attack Chain Simulation", "Killchain Logic"],
      "latency": ["Sequential Processing", "Parallel Neural Streams", "၃၀၀စက္ကန့် ပျမ်းမျှ"]
    }
  },
  "legal": {
    "title": "စစ်ဆေးခွင့်ဆိုင်ရာ ပရိုတောကော",
    "warning": "ခွင့်ပြုချက်မရှိဘဲ စစ်ဆေးခြင်းကို တားမြစ်သည်",
    "disclaimer": "စစ်ဆေးမှု စတင်ခြင်းဖြင့် သင်သည် ဤ website ကို စစ်ဆေးရန် တရားဝင် အခွင့်အာဏာရှိကြောင်း ဝန်ခံကတိပြုပါသည်။ VaultGuard Pro သည် ဆင်ခြင်တုံတရားဖြင့် တွက်ချက်ပေးသော စနစ်သာဖြစ်ပြီး အလွဲသုံးစားလုပ်မှုများအတွက် တာဝန်ယူမည်မဟုတ်ပါ။",
    "compliance": "SOC2 / HIPAA / ISO27001 စံနှုန်းများနှင့် အညီ စစ်ဆေးပေးနိုင်ပါသည်"
  },
  "level_descriptions": {
    "fast": "အခြေခံ DNS, SSL နှင့် Headers စစ်ဆေးမှု။ အမြန်ဆုံး အခြေအနေ သိရှိလိုသူများအတွက် သင့်လျော်သည်။",
    "standard": "ပြည့်စုံသော DNA ဆန်းစစ်မှု။ Website တစ်ခုလုံးရှိ နည်းပညာများ၏ အားနည်းချက်များကို Live CVE Database များဖြင့် တိုက်ဆိုင်စစ်ဆေးပါသည်။",
    "deep": "မှုခင်းပိုင်းဆိုင်ရာ Logic ဆန်းစစ်မှု။ 32K Thinking Budget ကို အသုံးပြုပြီး ရှုပ်ထွေးသော အားနည်းချက် ကွင်းဆက်များကို အသေးစိတ် တွက်ချက်ပေးပါသည်။"
  },
  "level_details": {
    "fast": {
      "data_collected": "Headers သာ, SSL အချက်အလက်, DNS records (DOM analysis မပါ)",
      "ai_model": "Gemini 3 Flash (မြန်ဆန်သော inference)",
      "thinking_budget": "မရှိပါ (Fast mode)",
      "scans": [
        { "test": "လုံခြုံရေး Headers", "method": "HTTP HEAD request analysis", "accuracy": "၉၅%" },
        { "test": "SSL/TLS Certificate", "method": "SSL Labs API + certificate validation", "accuracy": "၉၀%" },
        { "test": "DNS Records", "method": "Google DNS API lookup", "accuracy": "၉၀%" },
        { "test": "Network Perimeter", "method": "Headers + SSL + DNS analysis", "accuracy": "၈၅%" }
      ]
    },
    "standard": {
      "data_collected": "Headers + SSL + DNS + Security Signals (ပေါ့ပါးသော DOM signals, full DOM မပါ)",
      "ai_model": "Gemini 3 Flash (မြန်ဆန်သော inference)",
      "thinking_budget": "မရှိပါ (Standard mode)",
      "scans": [
        { "test": "FAST level အားလုံး", "method": "FAST level နည်းတူ", "accuracy": "၉၀-၉၅%" },
        { "test": "Security Signals", "method": "DOM signal extraction (forms, scripts, meta)", "accuracy": "၈၅%" },
        { "test": "Technology DNA", "method": "AI analysis of tech stack + CVE cross-reference", "accuracy": "၈၅%" },
        { "test": "Client-Side Vulnerabilities", "method": "XSS, CSRF, DOM flaws detection", "accuracy": "၈၅%" },
        { "test": "Dependency CVEs", "method": "Live CVE database cross-reference via Search Grounding", "accuracy": "၈၀%" }
      ]
    },
    "deep": {
      "data_collected": "အပြည့်အစုံ: Headers + SSL + DNS + Signals + Complete DOM (50K chars အထိ)",
      "ai_model": "Gemini 3 Pro (အနက်ရှိုင်းသော reasoning)",
      "thinking_budget": "32,768 tokens (ကျယ်ပြန့်သော reasoning)",
      "scans": [
        { "test": "STANDARD level အားလုံး", "method": "STANDARD level နည်းတူ", "accuracy": "၈၅-၉၅%" },
        { "test": "Full DOM Analysis", "method": "Complete HTML structure analysis (50K chars အထိ)", "accuracy": "၈၅%" },
        { "test": "Business Logic Flaws", "method": "32K token reasoning to simulate exploit chains", "accuracy": "၈၀%" },
        { "test": "Vulnerability Chaining", "method": "Multi-step attack path simulation", "accuracy": "၇၅%" },
        { "test": "Forensic Deduction", "method": "Deep reasoning about attack surface and logic flows", "accuracy": "၈၀%" }
      ]
    }
  },
  "labels": {
    "progress": "လုပ်ဆောင်မှု အခြေအနေ",
    "neural_load": "AI အသုံးပြုမှု",
    "est_compute": "တွက်ချက်မှု ကုန်ကျစရိတ်",
    "neural_engine": "နျူရယ် အင်ဂျင်",
    "telemetry": "တိုက်ရိုက် အချက်အလက်များ",
    "setup_engine": "အင်ဂျင်ကို ပြင်ဆင်ရန်",
    "engine_active": "အင်ဂျင်အဆင်သင့်ဖြစ်ပြီ",
    "mission_lifecycle": "လုပ်ဆောင်ချက် အဆင့်ဆင့်",
    "neural_vs_legacy": "နျူရယ် Logic နှင့် ရိုးရိုး စကင်နာ ကွာခြားချက်",
    "how_it_works": "အလုပ်လုပ်ပုံ",
    "core_specs": "AI နည်းပညာဆိုင်ရာ အချက်အလက်များ",
    "choose_intensity": "စစ်ဆေးမည့် အဆင့်ကို ရွေးချယ်ပါ",
    "command_buffer": "အမိန့်ပေး စနစ်",
    "legacy_scanners": "ရိုးရိုး စကင်နာများ",
    "vaultguard_neural": "VaultGuard နျူရယ်",
    "setup_guide": "အင်ဂျင်ပြင်ဆင်မှု လမ်းညွှန်",
    "sandbox_title": "နျူရယ် Sandbox စနစ်",
    "sandbox_desc": "AI နှင့် Sandbox ပူးပေါင်းလုပ်ဆောင်ပုံ",
    "forensic_logs": "မှုခင်းဆိုင်ရာ Sandbox မှတ်တမ်းများ",
    "risk_topology": "အန္တရာယ် အမျိုးအစားများ",
    "deductions": "AI ၏ တွက်ချက်မှုများ",
    "capabilities_limitations": "စွမ်းဆောင်ရည် နှင့် ကန့်သတ်ချက်များ",
    "can_test": "စစ်ဆေးနိုင်သော",
    "cannot_test": "စစ်ဆေးမရသော",
    "why": "ဘာလို့:",
    "why_can_test": "Browser APIs က headers ကို ရယူနိုင်တယ်၊ public APIs က SSL/DNS data ပေးတယ်၊ DOM analysis က client-side code အတွက် အလုပ်လုပ်တယ်",
    "why_cannot_test": "Browser security model က server-side access, raw network operations, file system access တွေကို တားမြစ်ထားတယ်",
    "ethical_warning": "ကိုယ်ကျင့်တရား သုံးစွဲမှု",
    "who_should_use": "ဤကိရိယာကို မည်သူများ သုံးသင့်သနည်း:",
    "prohibited_use": "တားမြစ်ထားသော အသုံးပြုမှု:",
    "legal_notice": "⚠️ တရားဝင် အသိပေးချက်: ခွင့်ပြုချက်မရှိဘဲ စစ်ဆေးခြင်းသည် နိုင်ငံအများစုတွင် တရားမဝင်ပါ။ မည်သည့် system ကိုမဆို စစ်ဆေးမီ ရေးထားသော ခွင့်ပြုချက် ရှိရမည်။ ဤကိရိယာသည် အလွဲသုံးစားလုပ်မှုအတွက် တာဝန်ယူမည်မဟုတ်ပါ။ တာဝန်ယူမှုရှိစွာ သုံးစွဲပါ။"
  },
  "sandbox_steps": {
    "s1": ["DOM_ISOLATION", "Website ၏ code များကို သီးသန့် ဘေးကင်းသော virtual environment ထဲသို့ ဆွဲယူခွဲထုတ်ခြင်း။"],
    "s2": ["NEURAL_MASKING", "အရေးကြီး အချက်အလက်များ (keys, emails) ကို AI ထံ မပို့မီ ဖျောက်ဖျက်ကာကွယ်ခြင်း။"],
    "s3": ["HEURISTIC_SIMULATION", "Gemini 3 Pro သည် ဖြစ်နိုင်ခြေရှိသော တိုက်ခိုက်မှုပေါင်း သန်းချီကို Sandbox ထဲတွင် စမ်းသပ်ခြင်း။"],
    "s4": ["LOGIC_VERIFICATION", "ရှာဖွေတွေ့ရှိသော အားနည်းချက်များကို Google Search Grounding ဖြင့် live တိုက်ဆိုင်စစ်ဆေးခြင်း။"]
  },
  "setup_manual": {
    "req_title": "လိုအပ်ချက်များ -",
    "req_1": "Google AI Studio API Key ရှိရမည်",
    "req_2": "Paid Billing Project (GCP) ဖြစ်ရမည်",
    "req_3": "Gemini 3 Model များ သုံးခွင့်ရှိရမည်",
    "step_title": "ပြင်ဆင်ပုံ -",
    "step_1": "Header ရှိ 'SETUP ENGINE' ခလုတ်ကို နှိပ်ပါ။",
    "step_2": "မိမိ၏ Paid Project မှ API Key ကို ရွေးချယ်ပါ။",
    "step_3": "Indicator အစိမ်းရောင် ပြောင်းသွားသည်အထိ စောင့်ပါ။"
  },
  "workflow_stages": {
    "s1": ["၀၁။ OSINT အချက်အလက် ရှာဖွေခြင်း", "Domain Grounding", "Subdomains, ports နှင့် WHOIS အချက်အလက်များကို ရှာဖွေခြင်း။"],
    "s2": ["၀၂။ CVE တိုက်ဆိုင်စစ်ဆေးခြင်း", "အားနည်းချက် ရှာဖွေခြင်း", "နောက်ဆုံးပေါ် Live CVE database များနှင့် တိုက်ဆိုင်စစ်ဆေးခြင်း။"],
    "s3": ["၀၃။ HEURISTIC နည်းပညာ ဆန်းစစ်ခြင်း", "တည်ဆောက်ပုံကို ပြန်လည်တည်ဆောက်ခြင်း", "Backend နည်းပညာနှင့် version အားနည်းချက်များကို ရှာဖွေခြင်း။"],
    "s4": ["၀၄။ LOGICAL ချိတ်ဆက် ဆန်းစစ်ခြင်း", "AI ၏ တွေးခေါ်မှုစနစ်", "ရှုပ်ထွေးသော အားနည်းချက် ကွင်းဆက်များကို 32K Token ဖြင့် ဆင်ခြင်တုံတရားဖြင့် တွက်ချက်ခြင်း။"]
  },
  "capabilities": {
    "security_headers": "လုံခြုံရေး Headers - X-Frame-Options, CSP, HSTS (၉၅% တိကျမှု)",
    "ssl_tls": "SSL/TLS - Certificate မှန်ကန်မှု, SSL အဆင့် (၉၀% တိကျမှု)",
    "client_vulns": "Client-Side အားနည်းချက်များ - XSS, CSRF, DOM အားနည်းချက်များ (၈၅% တိကျမှု)",
    "tech_stack": "နည်းပညာ Stack - နည်းပညာ ရှာဖွေမှု (၈၅% တိကျမှု)",
    "dns_info": "DNS အချက်အလက် - IP addresses, DNS records (၉၀% တိကျမှု)"
  },
  "limitations": {
    "sql_injection": "SQL Injection - Query တွေ run လို့မရဘူး (၄၀% တိကျမှု, pattern သာ)",
    "server_side": "Server-Side Code - Server access မရဘူး (၃၀% တိကျမှု, inference သာ)",
    "port_scanning": "Port Scanning - Raw TCP/UDP access မရဘူး",
    "file_system": "File System - Browser sandbox ကန့်သတ်ချက်များ",
    "cors_blocked": "CORS-Blocked APIs - Browser security ကန့်သတ်ချက်များ"
  },
  "who_can_use": {
    "website_owners": "Website ပိုင်ရှင်များ - မိမိ၏ website များကို စစ်ဆေးခြင်း",
    "authorized_teams": "ခွင့်ပြုထားသော Security Teams - ရေးထားသော ခွင့်ပြုချက်ဖြင့်",
    "bug_bounty": "Bug Bounty Researchers - တာဝန်ယူမှုရှိစွာ ထုတ်ဖော်ခြင်း",
    "auditors": "Security Auditors - Client ခွင့်ပြုချက်ဖြင့်"
  },
  "prohibited": {
    "unauthorized": "ခွင့်ပြုချက်မရှိသော စစ်ဆေးခြင်း - ရှင်းလင်းသော ခွင့်ပြုချက်မရှိဘဲ",
    "malicious": "မသမာသော လုပ်ဆောင်မှုများ - Hacking, data ခိုးယူခြင်း, disruption",
    "privacy": "ကိုယ်ရေးလုံခြုံမှု ချိုးဖောက်ခြင်း - ခွင့်ပြုချက်မရှိဘဲ စစ်ဆေးခြင်း",
    "illegal": "တရားမဝင် ဝင်ရောက်ခြင်း - ပိုင်ဆိုင်မှုမရှိသော systems များကို ချိုးဖောက်ဝင်ရောက်ခြင်း"
  },
  "pdf": {
    "title": "VAULTGUARD PRO",
    "subtitle": "NEURAL_FORENSIC_DEBRIEF_V1.0",
    "target_ident": "စစ်ဆေးမည့် URL",
    "timestamp": "အချိန်",
    "executive_intelligence": "အဓိက အချက်အလက်များ",
    "risk_score": "အန္တရာယ် အဆင့်",
    "mission_intensity": "စစ်ဆေးမှု အဆင့်",
    "neural_load": "AI အသုံးပြုမှု",
    "tokens": "tokens",
    "data_quality_assessment": "ဒေတာ အရည်အသွေး ဆန်းစစ်ချက်",
    "trust_score": "ယုံကြည်မှု အဆင့်",
    "trust_level": "ယုံကြည်မှု အဆင့်",
    "trust_high": "မြင့်",
    "trust_medium": "အလယ်အလတ်",
    "trust_low": "နိမ့်",
    "trust_very_low": "အလွန်နိမ့်",
    "limitations": "ကန့်သတ်ချက်များ",
    "forensic_deduction": "မှုခင်းဆိုင်ရာ ဆင်ခြင်တုံတရား",
    "no_analysis": "ဆန်းစစ်ချက် မရှိပါ။",
    "technology_dna": "နည်းပညာ DNA",
    "category": "အမျိုးအစား",
    "status": "အခြေအနေ",
    "action": "လုပ်ဆောင်ရန်",
    "probe_execution_details": "စမ်းသပ်မှု အသေးစိတ်",
    "response_time": "တုံ့ပြန်ချိန်",
    "vulnerable": "⚠ အားနည်းချက် ရှိသည်",
    "cors_blocked": "⚠ CORS ပိတ်ဆို့ထားသည်",
    "description": "ဖော်ပြချက်",
    "vulnerability_ledger": "အားနည်းချက် မှတ်တမ်း",
    "severity": "ပြင်းထန်မှု",
    "cwe": "CWE",
    "confidence": "ယုံကြည်မှု",
    "evidence_sources": "သက်သေအထောက်အထား အရင်းအမြစ်များ",
    "no_description": "ဖော်ပြချက် မရှိပါ။",
    "remediation": "ပြင်ဆင်ရန်",
    "no_remediation": "ပြင်ဆင်နည်း မရှိပါ။",
    "business_impact": "လုပ်ငန်း ထိခိုက်မှု",
    "proof_of_concept": "သက်သေပြမှု",
    "no_vulnerabilities": "AI ဆန်းစစ်မှုတွင် အားနည်းချက် မတွေ့ရှိပါ။",
    "error_generating": "PDF ထုတ်ယူရာတွင် အမှားအယွင်း ဖြစ်ပွားပါသည်။ Console တွင် အသေးစိတ် စစ်ဆေးပါ။"
  },
  "results": {
    "data_quality": "ဒေတာ အရည်အသွေး",
    "trustworthiness_assessment": "ယုံကြည်စိတ်ချရမှု ဆန်းစစ်ချက်",
    "high_trust": "မြင့်မားသော ယုံကြည်မှု",
    "medium_trust": "အလယ်အလတ် ယုံကြည်မှု",
    "low_trust": "နိမ့်သော ယုံကြည်မှု",
    "very_low_trust": "အလွန်နိမ့်သော ယုံကြည်မှု",
    "data_reliability_score": "ဒေတာ စိတ်ချရမှု အဆင့်",
    "limitations": "ကန့်သတ်ချက်များ",
    "available": "ရရှိနိုင်သည်",
    "blocked": "ပိတ်ဆို့ထားသည်",
    "limited": "ကန့်သတ်ထားသည်",
    "unavailable": "မရရှိနိုင်ပါ",
    "failed": "မအောင်မြင်ပါ",
    "executive_intel": "အဓိက အချက်အလက်များ",
    "forensic_target_reasoning": "မှုခင်းဆိုင်ရာ ဆင်ခြင်တုံတရား နှင့် အခြေအနေ",
    "security_score": "လုံခြုံရေး အဆင့်",
    "audit_intensity": "စစ်ဆေးမှု အပြင်းအထန်",
    "neural_forensic_deduction": "နျူရယ် မှုခင်းဆိုင်ရာ ဆင်ခြင်တုံတရား",
    "no_telemetry": "တိုက်ရိုက် အချက်အလက် မရှိပါ",
    "vulnerability_ledger": "အားနည်းချက် မှတ်တမ်း",
    "verified_findings": "အတည်ပြုထားသော တွေ့ရှိချက်များ (PoC နှင့်အတူ)",
    "technology_dna": "နည်းပညာ DNA",
    "detected_tech_stack": "ရှာဖွေတွေ့ရှိသော tech stack နှင့် version သန့်ရှင်းမှု",
    "logic_flow": "Logic_Flow",
    "injections": "Injections",
    "net_hygiene": "Net_Hygiene",
    "config_dna": "Config_DNA",
    "severity_severity": "_SEVERITY",
    "chain_high": "CHAIN: HIGH",
    "proof_of_concept_script": "သက်သေပြမှု Script",
    "remediation_directive": "ပြင်ဆင်ရန် ညွှန်ကြားချက်",
    "business_impact": "လုပ်ငန်း ထိခိုက်မှု",
    "high_risk_logic": "Logic manipulation အန္တရာယ် မြင့်မားသည်။",
    "payload_verification": "# Payload verification simulation complete"
  },
  "webaudit": {
    "mission_active": "လုပ်ဆောင်ချက် အသက်ဝင်သည်",
    "progress": "လုပ်ဆောင်မှု",
    "tactical_dispatcher": "Tactical_Dispatcher",
    "live_mission_telemetry": "တိုက်ရိုက် လုပ်ဆောင်ချက် အချက်အလက်",
    "telemetry_log": "တိုက်ရိုက် အချက်အလက် မှတ်တမ်း"
  },
  "virtualhud": {
    "target_reconnaissance": "စစ်ဆေးမည့် Website",
    "neural_threat": "နျူရယ် အန္တရာယ်",
    "neural_blueprint": "နျူရယ် Blueprint",
    "target_reconstruction": "Target reconstruction active",
    "visual": "မြင်ကွင်း",
    "geo": "ပထဝီ",
    "logic": "Logic"
  },
  "apikey": {
    "hide_token": "Token ကို ဖျောက်ရန်",
    "show_token": "Token ကို ပြရန်",
    "invalid_format": "မှားယွင်းသော format (အနည်းဆုံး ၂၀ လုံး လိုအပ်သည်)"
  }
};
