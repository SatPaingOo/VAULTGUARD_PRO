import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to convert hex to RGB
const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 212, 255]; // Fallback to Vault Blue
};

// English translations (simplified from locales/en.ts)
const tEn = (path: string): string => {
  const translations: Record<string, string> = {
    'pdf.scan_id': 'Scan ID',
    'pdf.operator': 'Operator',
    'pdf.timestamp': 'Timestamp',
    'pdf.mission_duration': 'Mission Duration',
    'pdf.start_time': 'Start Time',
    'pdf.end_time': 'End Time',
    'pdf.executive_intelligence': 'EXECUTIVE INTELLIGENCE',
    'pdf.risk_score': 'Risk Score',
    'pdf.mission_intensity': 'Mission Intensity',
    'pdf.neural_load': 'Neural Load',
    'pdf.tokens': 'tokens',
    'pdf.vulnerability_ledger': 'VULNERABILITY LEDGER',
    'pdf.severity': 'Severity',
    'pdf.cwe': 'CWE',
    'pdf.remediation': 'REMEDIATION',
    'pdf.business_impact': 'BUSINESS IMPACT',
    'pdf.proof_of_concept': 'PROOF OF CONCEPT',
    'results.target_summary': 'TARGET_SUMMARY',
    'results.domain': 'Domain',
    'results.ip_address': 'IP Address',
    'results.hosting_provider': 'Hosting Provider',
    'results.location': 'Location',
    'results.subdomains': 'Subdomains',
    'results.associated_links': 'Associated Links',
    'results.apis': 'APIs',
    'results.business_logic': 'BUSINESS_LOGIC',
    'results.purpose': 'Purpose',
    'results.attack_surface': 'Attack Surface Summary',
  };
  return translations[path] || path;
};

// Dummy data for testing
const createDummyData = () => {
  const now = new Date();
  const startTime = new Date(now.getTime() - 300000); // 5 minutes ago
  
  return {
    targetUrl: 'https://example.com',
    level: 'STANDARD' as const,
    securityScore: 75,
    usage: { tokens: 15000, cost: 0.05 },
    missionDuration: {
      startTime,
      endTime: now,
      durationMs: 300000,
      formatted: '5m 0s',
      formattedFull: '5 minutes 0 seconds'
    },
    missionReport: {
      targetIntelligence: {
        purpose: 'E-commerce Platform - Online shopping and payment processing system',
        businessLogic: 'User registration → Product browsing → Cart management → Checkout → Payment processing → Order fulfillment',
        attackSurfaceSummary: 'Multiple API endpoints (/api/v1/products, /api/v1/users, /api/v1/orders), authentication systems (JWT-based), payment gateways (Stripe integration), and admin panel access',
        forensicAnalysis: 'Standard web application with modern stack: React frontend, Node.js backend, PostgreSQL database, Redis caching, and AWS cloud infrastructure',
        apis: ['/api/v1/products', '/api/v1/users', '/api/v1/orders', '/api/v1/payments'],
        associatedLinks: ['https://www.example.com', 'https://api.example.com', 'https://admin.example.com', 'https://cdn.example.com'],
        hosting: {
          provider: 'AWS',
          location: 'US East (N. Virginia)',
          ip: '192.0.2.1',
          latitude: 38.9072,
          longitude: -77.0369
        },
        groundingSources: [
          { uri: 'https://example.com', title: 'Example Domain', url: 'https://example.com' }
        ]
      },
      activeProbes: [
        {
          endpoint: '/api/v1/users',
          method: 'GET',
          expectedBehavior: 'Should return 401 for unauthorized access'
        },
        {
          endpoint: '/api/v1/products',
          method: 'POST',
          expectedBehavior: 'Should validate input and require authentication'
        }
      ],
      digitalFootprint: [],
      technologyDNA: [
        { category: 'Framework', status: 'Detected', action: 'React 18.2.0' },
        { category: 'Server', status: 'Detected', action: 'Nginx 1.24.0' },
        { category: 'Database', status: 'Detected', action: 'PostgreSQL 15.2' }
      ],
      findings: [
        {
          title: 'SQL Injection Vulnerability in User Endpoint',
          description: 'User input is not properly sanitized in database queries. The /api/v1/users endpoint directly concatenates user input into SQL queries without parameterization, allowing attackers to manipulate database queries.',
          severity: 'High' as const,
          remediation: 'Use parameterized queries (prepared statements) and implement input validation. Consider using an ORM that handles SQL injection prevention automatically.',
          businessImpact: 'Potential data breach, unauthorized access to user accounts, and exposure of sensitive customer information. Could result in GDPR violations and financial losses.',
          cwe: 'CWE-89',
          origin: 'Database Layer',
          poc: "SELECT * FROM users WHERE id = '1' OR '1'='1'",
          confidence: 'High' as const,
          evidence: ['Found in /api/v1/users endpoint', 'SQL query construction in userService.js:45']
        },
        {
          title: 'Missing Security Headers',
          description: 'X-Frame-Options, Content-Security-Policy, and X-Content-Type-Options headers are not set in HTTP responses. This leaves the application vulnerable to clickjacking attacks and XSS attacks.',
          severity: 'Medium' as const,
          remediation: 'Add security headers to all HTTP responses: X-Frame-Options: DENY, Content-Security-Policy: default-src \'self\', X-Content-Type-Options: nosniff',
          businessImpact: 'Increased risk of clickjacking attacks, potential for XSS attacks, and reduced protection against MIME type sniffing attacks.',
          cwe: 'CWE-1021',
          origin: 'HTTP Headers',
          poc: 'curl -I https://example.com',
          confidence: 'Medium' as const,
          evidence: ['Response headers analysis', 'Security header scan results']
        },
        {
          title: 'Weak Authentication Mechanism',
          description: 'The application uses weak password requirements (minimum 6 characters, no complexity requirements) and does not implement account lockout after failed login attempts.',
          severity: 'Medium' as const,
          remediation: 'Implement strong password policy (minimum 12 characters, mixed case, numbers, special characters) and add account lockout mechanism after 5 failed attempts.',
          businessImpact: 'Increased risk of brute force attacks and unauthorized account access. Potential for credential stuffing attacks.',
          cwe: 'CWE-307',
          origin: 'Authentication System',
          poc: 'POST /api/v1/auth/login with weak password',
          confidence: 'High' as const,
          evidence: ['Password policy analysis', 'Authentication flow review']
        }
      ],
      securityScore: 75,
      confidenceScore: 85,
      dataQuality: {
        trustScore: 90,
        trustLevel: 'HIGH' as const,
        sources: {
          dom: true,
          headers: true,
          ssl: true,
          dns: true,
          osint: true,
          probes: true
        },
        limitations: []
      }
    },
    telemetry: [],
    dispatchedProbes: []
  };
};

// PDF Generation function (simplified version based on Results.tsx)
const generateTestPDF = async (logoPath?: string): Promise<{ success: boolean; hasLogo: boolean; errors: string[]; pageCount: number; fileSize: number }> => {
  const errors: string[] = [];
  let hasLogo = false;
  let pageCount = 0;
  let fileSize = 0;
  
  try {
    const data = createDummyData();
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString();
    
    // Generate Scan ID
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const scanId = `VG-${dateStr}-${timeStr}`;
    
    const operatorName = "VaultGuard Neural Agent";
    const themeColor = '#00d4ff'; // Vault Blue
    const rgb = hexToRgb(themeColor);
    const { targetIntelligence, findings, technologyDNA, dataQuality } = data.missionReport;
    
    // Enhanced Header with Logo area - Clean design
    const headerHeight = 45; // Compact header - logo, title, subtitle only
    doc.setFillColor(2, 4, 8); // Deep Navy
    doc.rect(0, 0, 210, headerHeight, 'F');
    
    // Add colored bar at top
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.rect(0, 0, 210, 8, 'F');
    
    // Center logo and make it bigger
    const pageWidth = 210; // A4 width in mm
    const logoWidth = 25; // Bigger logo
    const logoHeight = 25; // Bigger logo
    const logoX = (pageWidth - logoWidth) / 2; // Center horizontally
    const logoY = 12; // Start after cyan bar with spacing
    
    // Try to load and add logo
    if (logoPath && fs.existsSync(logoPath)) {
      try {
        const logoData = fs.readFileSync(logoPath);
        const logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`;
        
        doc.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);
        hasLogo = true;
        console.log('✅ Logo loaded successfully');
      } catch (err) {
        errors.push(`Logo loading failed: ${err}`);
        console.warn('⚠️ Logo loading failed, using emoji fallback');
        doc.setFontSize(24);
        const emojiX = (pageWidth - doc.getTextWidth("🛡️")) / 2;
        doc.text("🛡️", emojiX, logoY + 5);
      }
    } else {
      errors.push('Logo file not found at specified path');
      console.warn('⚠️ Logo file not found, using emoji fallback');
      doc.setFontSize(24);
      const emojiX = (pageWidth - doc.getTextWidth("🛡️")) / 2;
      doc.text("🛡️", emojiX, logoY + 5);
    }
    
    // Title below logo - centered
    const titleY = logoY + logoHeight + 6; // Below logo with proper spacing
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    doc.setFont("courier", "bold");
    doc.setFontSize(18);
    
    // "VAULTGUARD PRO" text
    const titleText = "VAULTGUARD PRO";
    const titleWidth = doc.getTextWidth(titleText);
    const titleX = (pageWidth - titleWidth) / 2; // Center
    doc.text(titleText, titleX, titleY);
    
    // Version "v1.1.0" - smaller, inline with title
    doc.setFontSize(10); // Smaller font
    doc.setTextColor(150, 150, 150); // Gray color
    doc.setFont("courier", "normal");
    const versionText = "v1.1.0";
    const versionX = titleX + titleWidth + 3; // Right after title
    doc.text(versionText, versionX, titleY);
    
    // Subtitle "NEURAL FORENSIC DEBRIEF" - centered below title
    const subtitleY = titleY + 6; // Proper spacing from title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("courier", "normal");
    const subtitleText = "NEURAL FORENSIC DEBRIEF";
    const subtitleWidth = doc.getTextWidth(subtitleText);
    const subtitleX = (pageWidth - subtitleWidth) / 2; // Center
    doc.text(subtitleText, subtitleX, subtitleY);
    
    // Body Sections - start after header with proper spacing
    let yPos = headerHeight + 12; // 12mm spacing after header
    
    // Executive Intelligence Section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("courier", "bold");
    doc.text(tEn('pdf.executive_intelligence'), 15, yPos);
    
    yPos += 10;
    doc.setFontSize(9);
    doc.setFont("courier", "normal");
    doc.setTextColor(100, 100, 100); // Gray for metadata
    // Scan Information - integrated into Executive Intelligence section
    doc.text(`${tEn('pdf.scan_id')}: ${scanId}`, 15, yPos);
    yPos += 5;
    doc.text(`${tEn('pdf.timestamp')}: ${timestamp}`, 15, yPos);
    
    // Main metrics - back to black
    yPos += 8;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    yPos += 10;
    doc.setFontSize(10);
    doc.text(`${tEn('pdf.risk_score')}: ${data.securityScore}/100`, 15, yPos);
    yPos += 6;
    doc.text(`${tEn('pdf.mission_intensity')}: ${data.level}`, 15, yPos);
    yPos += 6;
    doc.text(`${tEn('pdf.neural_load')}: ${data.usage.tokens.toLocaleString()} ${tEn('pdf.tokens')}`, 15, yPos);
    yPos += 6;
    doc.text(`Target: ${data.targetUrl}`, 15, yPos);
    yPos += 6;
    doc.text(`${tEn('pdf.operator')}: ${operatorName}`, 15, yPos);
    
    // Mission Duration
    if (data.missionDuration) {
      yPos += 6;
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`${tEn('pdf.mission_duration')}: ${data.missionDuration.formattedFull}`, 15, yPos);
      yPos += 5;
      doc.text(`${tEn('pdf.start_time')}: ${data.missionDuration.startTime.toLocaleString()}`, 15, yPos);
      yPos += 5;
      doc.text(`${tEn('pdf.end_time')}: ${data.missionDuration.endTime.toLocaleString()}`, 15, yPos);
    }
    
    // Target Summary
    yPos += 25;
    if (yPos > 280) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(12);
    doc.setFont("courier", "bold");
    doc.text(tEn('results.target_summary'), 15, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    doc.setFont("courier", "normal");
    doc.text(`${tEn('results.domain')}: ${data.targetUrl}`, 15, yPos);
    yPos += 6;
    doc.text(`${tEn('results.ip_address')}: ${targetIntelligence.hosting.ip}`, 15, yPos);
    yPos += 6;
    doc.text(`${tEn('results.hosting_provider')}: ${targetIntelligence.hosting.provider}`, 15, yPos);
    yPos += 6;
    doc.text(`${tEn('results.location')}: ${targetIntelligence.hosting.location}`, 15, yPos);
    
    // Associated Links
    if (targetIntelligence.associatedLinks && targetIntelligence.associatedLinks.length > 0) {
      yPos += 3;
      doc.setFont("courier", "bold");
      doc.text(`${tEn('results.subdomains')} / ${tEn('results.associated_links')}:`, 15, yPos);
      yPos += 6;
      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      targetIntelligence.associatedLinks.forEach((link: string) => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        const linkText = doc.splitTextToSize(`• ${link}`, 180);
        linkText.forEach((line: string) => {
          doc.text(line, 20, yPos);
          yPos += 5;
        });
      });
      yPos += 3;
    }
    
    // APIs
    if (targetIntelligence.apis && targetIntelligence.apis.length > 0) {
      yPos += 3;
      doc.setFont("courier", "bold");
      doc.setFontSize(9);
      doc.text(`${tEn('results.apis')}:`, 15, yPos);
      yPos += 6;
      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      targetIntelligence.apis.forEach((api: string) => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        const apiText = doc.splitTextToSize(`• ${api}`, 180);
        apiText.forEach((line: string) => {
          doc.text(line, 20, yPos);
          yPos += 5;
        });
      });
      yPos += 3;
    }
    
    // Business Logic
    if (targetIntelligence.purpose || targetIntelligence.businessLogic || targetIntelligence.attackSurfaceSummary) {
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(12);
      doc.setFont("courier", "bold");
      doc.text(tEn('results.business_logic'), 15, yPos);
      yPos += 8;
      
      doc.setFontSize(9);
      doc.setFont("courier", "normal");
      
      if (targetIntelligence.purpose && targetIntelligence.purpose !== '---') {
        doc.setFont("courier", "bold");
        doc.text(`${tEn('results.purpose')}:`, 15, yPos);
        yPos += 6;
        doc.setFont("courier", "normal");
        const purposeText = doc.splitTextToSize(targetIntelligence.purpose, 180);
        purposeText.forEach((line: string) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, 20, yPos);
          yPos += 5;
        });
        yPos += 3;
      }
      
      if (targetIntelligence.businessLogic && targetIntelligence.businessLogic !== '---') {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFont("courier", "bold");
        doc.text(`${tEn('results.business_logic')}:`, 15, yPos);
        yPos += 6;
        doc.setFont("courier", "normal");
        const logicText = doc.splitTextToSize(targetIntelligence.businessLogic, 180);
        logicText.forEach((line: string) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, 20, yPos);
          yPos += 5;
        });
        yPos += 3;
      }
      
      if (targetIntelligence.attackSurfaceSummary && targetIntelligence.attackSurfaceSummary !== '---') {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFont("courier", "bold");
        doc.text(`${tEn('results.attack_surface')}:`, 15, yPos);
        yPos += 6;
        doc.setFont("courier", "normal");
        const surfaceText = doc.splitTextToSize(targetIntelligence.attackSurfaceSummary, 180);
        surfaceText.forEach((line: string) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, 20, yPos);
          yPos += 5;
        });
        yPos += 3;
      }
    }
    
    // Vulnerabilities
    if (findings.length > 0) {
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(12);
      doc.setFont("courier", "bold");
      doc.text(tEn('pdf.vulnerability_ledger'), 15, yPos);
      yPos += 8;
      
      findings.forEach((finding, index) => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(10);
        doc.setFont("courier", "bold");
        doc.text(`${index + 1}. ${finding.title}`, 15, yPos);
        yPos += 6;
        
        doc.setFontSize(8);
        doc.setFont("courier", "normal");
        const descLines = doc.splitTextToSize(finding.description, 180);
        descLines.forEach((line: string) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, 20, yPos);
          yPos += 5;
        });
        
        yPos += 3;
        doc.text(`${tEn('pdf.severity')}: ${finding.severity} | ${tEn('pdf.cwe')}: ${finding.cwe}`, 20, yPos);
        yPos += 8;
      });
    }
    
    // Save PDF
    const outputPath = path.join(process.cwd(), 'test-output.pdf');
    const pdfOutput = doc.output('arraybuffer');
    fs.writeFileSync(outputPath, Buffer.from(pdfOutput));
    
    pageCount = doc.getNumberOfPages();
    fileSize = fs.statSync(outputPath).size;
    
    console.log(`\n✅ PDF generated successfully: ${outputPath}`);
    console.log(`📄 File size: ${fileSize} bytes (${(fileSize / 1024).toFixed(2)} KB)`);
    console.log(`📑 Pages: ${pageCount}`);
    
    return { success: true, hasLogo, errors, pageCount, fileSize };
    
  } catch (error) {
    errors.push(`PDF generation failed: ${error}`);
    return { success: false, hasLogo, errors, pageCount, fileSize };
  }
};

// Main execution
const main = async () => {
  console.log('🔍 Starting PDF Test with Dummy Data...\n');
  
  // Try to find logo
  const possibleLogoPaths = [
    path.join(process.cwd(), 'public', 'assets', 'images', 'LOGO.png'),
    path.join(process.cwd(), 'assets', 'images', 'LOGO.png'),
    path.join(__dirname, '..', 'public', 'assets', 'images', 'LOGO.png'),
    path.resolve(__dirname, '../public/assets/images/LOGO.png')
  ];
  
  let logoPath: string | undefined;
  for (const p of possibleLogoPaths) {
    if (fs.existsSync(p)) {
      logoPath = p;
      console.log(`📸 Found logo at: ${logoPath}`);
      break;
    }
  }
  
  if (!logoPath) {
    console.log('⚠️ Logo not found, will use emoji fallback');
  }
  
  const result = await generateTestPDF(logoPath);
  
  console.log('\n📊 Test Results:');
  console.log(`   Success: ${result.success ? '✅' : '❌'}`);
  console.log(`   Logo Present: ${result.hasLogo ? '✅' : '❌'}`);
  console.log(`   Pages: ${result.pageCount}`);
  console.log(`   File Size: ${result.fileSize} bytes (${(result.fileSize / 1024).toFixed(2)} KB)`);
  
  if (result.errors.length > 0) {
    console.log('\n⚠️ Errors/Warnings:');
    result.errors.forEach(err => console.log(`   - ${err}`));
  }
  
  // Format validation
  if (result.success) {
    const pdfPath = path.join(process.cwd(), 'test-output.pdf');
    if (fs.existsSync(pdfPath)) {
      const stats = fs.statSync(pdfPath);
      console.log('\n📋 Format Validation:');
      console.log(`   File exists: ✅`);
      console.log(`   File size: ${stats.size} bytes`);
      console.log(`   File extension: .pdf ✅`);
      
      // Basic PDF header check
      const pdfBuffer = fs.readFileSync(pdfPath);
      const pdfHeader = pdfBuffer.slice(0, 4).toString();
      if (pdfHeader === '%PDF') {
        console.log(`   PDF header: ✅ (Valid PDF format)`);
      } else {
        console.log(`   PDF header: ❌ (Invalid format)`);
      }
      
      // Check PDF version
      const pdfVersion = pdfBuffer.slice(5, 8).toString();
      console.log(`   PDF version: ${pdfVersion}`);
      
      // Check if PDF contains logo (basic check - look for image objects)
      const pdfText = pdfBuffer.toString('latin1');
      if (pdfText.includes('/Image') || pdfText.includes('/XObject')) {
        console.log(`   Contains images: ✅`);
      } else {
        console.log(`   Contains images: ❌ (No images found)`);
      }
    }
  }
  
  console.log('\n✨ Test completed!');
  console.log(`\n💡 To view the PDF, open: ${path.join(process.cwd(), 'test-output.pdf')}`);
};

main().catch(console.error);
