const clone = (value) => JSON.parse(JSON.stringify(value));

const buildStepUpConfig = (actionLabel, reasons, helperText) => ({
  actionLabel,
  reasons,
  helperText,
});

const CASE_RISK_SUMMARIES = [
  {
    entityType: "order",
    entityId: "ORD-015",
    riskScore: 18,
    riskLevel: "low",
    recommendedAction: "Lanjutkan approval standar setelah bukti transfer diverifikasi.",
    sessionRiskState: {
      accessState: "Normal Access",
      sessionRiskLevel: "low",
      otpRequired: false,
      deviceStatus: "trusted",
      reasons: [
        "Trusted device token match terdeteksi.",
        "Fingerprint similarity berada di atas baseline aman.",
        "Tidak ada login gagal atau OTP retry abuse pada sesi ini.",
      ],
    },
    trustedDeviceStatus: {
      deviceLabel: "Admin MacBook Pro",
      browser: "Chrome 134",
      os: "macOS Sonoma",
      lastSeen: "14 Apr 2025, 09:11",
      trustLevel: "trusted",
      verificationRequired: false,
      verificationStatus: "Trusted session confirmed",
      trustedDeviceTokenMatch: true,
      fingerprintSimilarity: 96,
      userAgentMatch: true,
      subnetSimilarity: 94,
      reasons: [
        "Trusted device token cocok dengan histori admin sebelumnya.",
        "Browser dan OS sesuai dengan profil perangkat yang dikenal.",
      ],
    },
    stepUpConfig: {
      approvePayment: buildStepUpConfig(
        "Approve Payment",
        ["Sensitive action requires confirmation.", "Approval tetap dicatat dengan OTP untuk audit trail admin."],
        "Masukkan kode verifikasi untuk melanjutkan approval pembayaran."
      ),
      rejectPayment: buildStepUpConfig(
        "Reject Payment",
        ["Reject payment memengaruhi status transaksi customer.", "Aksi ini memerlukan konfirmasi ekstra untuk audit trail."],
        "Verifikasi ulang sebelum penolakan pembayaran disimpan."
      ),
      resolveHighRiskFlag: buildStepUpConfig(
        "Resolve High Risk Flag",
        ["Resolving flag akan mengubah status review keamanan.", "Aksi ini perlu jejak verifikasi tambahan."],
        "Konfirmasi OTP admin sebelum flag ditandai selesai."
      ),
    },
    flags: [
      {
        id: "flag-ord-015-1",
        ruleCode: "RISK-NEW-DEVICE",
        title: "New Device Login",
        severity: "low",
        status: "reviewed",
        reason: "Login dilakukan dari device baru, tetapi fingerprint similarity dan token trust tetap tinggi.",
        createdAt: "14 Apr 2025, 09:12",
      },
    ],
    breakdown: [
      { label: "New device detected", scoreImpact: 15 },
      { label: "Trusted device token match lowers overall risk context", scoreImpact: 3 },
    ],
    timeline: [
      { id: "ord-015-evt-1", type: "auth", label: "Login success", timestamp: "14 Apr 2025, 09:10", status: "success" },
      { id: "ord-015-evt-2", type: "device", label: "Trusted device matched", timestamp: "14 Apr 2025, 09:11", status: "success" },
      { id: "ord-015-evt-3", type: "device", label: "New device detected with high similarity", timestamp: "14 Apr 2025, 09:12", status: "warning" },
      { id: "ord-015-evt-4", type: "order", label: "Order created", timestamp: "14 Apr 2025, 09:14" },
      { id: "ord-015-evt-5", type: "payment", label: "Transfer proof uploaded", timestamp: "14 Apr 2025, 09:18" },
      { id: "ord-015-evt-6", type: "risk", label: "Risk review completed", timestamp: "14 Apr 2025, 09:20", status: "success" },
    ],
  },
  {
    entityType: "order",
    entityId: "ORD-011",
    riskScore: 55,
    riskLevel: "medium",
    recommendedAction: "Verifikasi identitas dan bukti transfer sebelum approval dilakukan.",
    sessionRiskState: {
      accessState: "Semi-Trusted",
      sessionRiskLevel: "medium",
      otpRequired: false,
      deviceStatus: "known-unusual-network",
      reasons: [
        "Perangkat pernah terlihat sebelumnya, tetapi subnet jaringan berbeda dari baseline.",
        "Ada OTP resend berulang sebelum checkout selesai.",
        "Multiple orders in short time menaikkan risiko sesi ini.",
      ],
    },
    trustedDeviceStatus: {
      deviceLabel: "Admin Windows Workstation",
      browser: "Edge 133",
      os: "Windows 11",
      lastSeen: "09 Apr 2025, 16:40",
      trustLevel: "semi-trusted",
      verificationRequired: true,
      verificationStatus: "Known device, unusual network",
      trustedDeviceTokenMatch: true,
      fingerprintSimilarity: 84,
      userAgentMatch: true,
      subnetSimilarity: 42,
      reasons: [
        "Trusted token cocok, tetapi lokasi jaringan tidak biasa.",
        "Network similarity rendah sehingga session dianggap semi-trusted.",
      ],
    },
    stepUpConfig: {
      approvePayment: buildStepUpConfig(
        "Approve Payment",
        ["Known device terdeteksi pada jaringan yang tidak biasa.", "Case memiliki medium risk score karena order burst dan OTP retry."],
        "Verifikasi tambahan diperlukan sebelum approval pembayaran diproses."
      ),
      rejectPayment: buildStepUpConfig(
        "Reject Payment",
        ["Sensitive action requires confirmation.", "Reject action pada semi-trusted session perlu OTP tambahan."],
        "Masukkan OTP admin untuk mengonfirmasi penolakan pembayaran."
      ),
      resolveHighRiskFlag: buildStepUpConfig(
        "Resolve High Risk Flag",
        ["Open flags masih memengaruhi decision support case ini.", "Resolving flag perlu verifikasi tambahan pada session semi-trusted."],
        "OTP dibutuhkan sebelum status flag dapat diubah."
      ),
    },
    flags: [
      {
        id: "flag-ord-011-1",
        ruleCode: "RISK-ORDER-BURST",
        title: "High Order Frequency",
        severity: "medium",
        status: "open",
        reason: "Terdeteksi beberapa order dibuat dalam waktu kurang dari 2 menit.",
        createdAt: "15 Apr 2025, 11:03",
      },
      {
        id: "flag-ord-011-2",
        ruleCode: "RISK-OTP-RETRY",
        title: "OTP Retry Abuse",
        severity: "medium",
        status: "reviewed",
        reason: "OTP diminta ulang beberapa kali sebelum checkout selesai.",
        createdAt: "15 Apr 2025, 11:07",
      },
      {
        id: "flag-ord-011-3",
        ruleCode: "RISK-DEVICE-NET",
        title: "Known Device but Unusual Network",
        severity: "low",
        status: "open",
        reason: "Perangkat dikenal, tetapi IP/subnet bergeser cukup jauh dari pola biasanya.",
        createdAt: "15 Apr 2025, 11:09",
      },
    ],
    breakdown: [
      { label: "Multiple orders in short time", scoreImpact: 25 },
      { label: "OTP retry abuse", scoreImpact: 15 },
      { label: "Known device on unusual network", scoreImpact: 15 },
    ],
    timeline: [
      { id: "ord-011-evt-1", type: "auth", label: "Login success", timestamp: "15 Apr 2025, 10:58", status: "success" },
      { id: "ord-011-evt-2", type: "device", label: "Known device matched", timestamp: "15 Apr 2025, 10:59", status: "success" },
      { id: "ord-011-evt-3", type: "network", label: "Known device on unusual network", timestamp: "15 Apr 2025, 10:59", status: "warning" },
      { id: "ord-011-evt-4", type: "otp", label: "OTP resend triggered twice", timestamp: "15 Apr 2025, 11:00", status: "warning" },
      { id: "ord-011-evt-5", type: "order", label: "Order created", timestamp: "15 Apr 2025, 11:02" },
      { id: "ord-011-evt-6", type: "payment", label: "Transfer proof uploaded", timestamp: "15 Apr 2025, 11:06" },
      { id: "ord-011-evt-7", type: "risk", label: "Medium-risk flag created", timestamp: "15 Apr 2025, 11:07", status: "warning" },
    ],
  },
  {
    entityType: "order",
    entityId: "ORD-012",
    riskScore: 95,
    riskLevel: "high",
    recommendedAction: "Tahan approval, minta step-up verification, lalu review manual sebelum dana diproses.",
    sessionRiskState: {
      accessState: "OTP Required",
      sessionRiskLevel: "high",
      otpRequired: true,
      deviceStatus: "unrecognized",
      reasons: [
        "Repeated failed login terdeteksi sebelum sesi berhasil.",
        "Perangkat tidak dikenali dan fingerprint similarity rendah.",
        "OTP retry abuse dan shared IP anomaly membuat session masuk kategori high risk.",
      ],
    },
    trustedDeviceStatus: {
      deviceLabel: "Unknown Android Browser",
      browser: "Chrome Mobile 133",
      os: "Android 15",
      lastSeen: "Never seen before",
      trustLevel: "new",
      verificationRequired: true,
      verificationStatus: "Step-up required before sensitive action",
      trustedDeviceTokenMatch: false,
      fingerprintSimilarity: 41,
      userAgentMatch: false,
      subnetSimilarity: 18,
      reasons: [
        "Trusted device token tidak ditemukan pada sesi ini.",
        "Fingerprint similarity terlalu rendah untuk dianggap known device.",
        "Jaringan dan user agent tidak cocok dengan histori device admin sebelumnya.",
      ],
    },
    stepUpConfig: {
      approvePayment: buildStepUpConfig(
        "Approve Payment",
        ["High risk case membutuhkan step-up verification.", "New / unrecognized device terdeteksi pada sesi saat ini.", "Repeated failed login dan OTP retry abuse masih aktif."],
        "Approval pembayaran ditahan sampai OTP admin berhasil diverifikasi."
      ),
      rejectPayment: buildStepUpConfig(
        "Reject Payment",
        ["Sensitive action requires confirmation.", "High-risk session sedang menggunakan perangkat yang belum dipercaya."],
        "Masukkan OTP admin sebelum penolakan pembayaran dikunci ke sistem."
      ),
      resolveHighRiskFlag: buildStepUpConfig(
        "Resolve High Risk Flag",
        ["Flag high risk tidak boleh ditutup tanpa verifikasi tambahan.", "Current session masih tergolong OTP Required."],
        "OTP diperlukan untuk menandai high-risk flag sebagai resolved."
      ),
    },
    flags: [
      {
        id: "flag-ord-012-1",
        ruleCode: "RISK-LOGIN-FAIL",
        title: "Repeated Failed Login",
        severity: "high",
        status: "open",
        reason: "Akun mengalami beberapa login gagal sebelum sesi yang berhasil.",
        createdAt: "15 Apr 2025, 08:35",
      },
      {
        id: "flag-ord-012-2",
        ruleCode: "RISK-DEVICE-NEW",
        title: "New Device Detected",
        severity: "high",
        status: "open",
        reason: "Perangkat dan fingerprint tidak cocok dengan histori trusted device.",
        createdAt: "15 Apr 2025, 08:36",
      },
      {
        id: "flag-ord-012-3",
        ruleCode: "RISK-ORDER-BURST",
        title: "Multiple Orders in Short Time",
        severity: "high",
        status: "open",
        reason: "Pola checkout menunjukkan burst order yang tidak normal untuk akun ini.",
        createdAt: "15 Apr 2025, 08:44",
      },
      {
        id: "flag-ord-012-4",
        ruleCode: "RISK-OTP-ABUSE",
        title: "OTP Retry Abuse",
        severity: "medium",
        status: "open",
        reason: "Percobaan OTP gagal dan resend berulang terjadi sebelum order dibuat.",
        createdAt: "15 Apr 2025, 08:43",
      },
      {
        id: "flag-ord-012-5",
        ruleCode: "RISK-IP-SHARE",
        title: "Shared IP Anomaly",
        severity: "high",
        status: "reviewed",
        reason: "IP checkout cocok dengan akun lain yang sedang ditinjau karena aktivitas tidak biasa.",
        createdAt: "15 Apr 2025, 08:41",
      },
    ],
    breakdown: [
      { label: "Repeated failed login", scoreImpact: 20 },
      { label: "New device detected", scoreImpact: 15 },
      { label: "Multiple orders in short time", scoreImpact: 25 },
      { label: "OTP retry abuse", scoreImpact: 15 },
      { label: "Shared IP anomaly", scoreImpact: 20 },
    ],
    timeline: [
      { id: "ord-012-evt-1", type: "auth", label: "Login failed three times", timestamp: "15 Apr 2025, 08:31", status: "danger" },
      { id: "ord-012-evt-2", type: "auth", label: "Login success", timestamp: "15 Apr 2025, 08:35", status: "success" },
      { id: "ord-012-evt-3", type: "device", label: "New device detected", timestamp: "15 Apr 2025, 08:36", status: "danger" },
      { id: "ord-012-evt-4", type: "network", label: "Shared IP anomaly identified", timestamp: "15 Apr 2025, 08:41", status: "warning" },
      { id: "ord-012-evt-5", type: "otp", label: "OTP failed twice", timestamp: "15 Apr 2025, 08:42", status: "danger" },
      { id: "ord-012-evt-6", type: "step-up", label: "Step-up verification required", timestamp: "15 Apr 2025, 08:43", status: "warning" },
      { id: "ord-012-evt-7", type: "order", label: "Order created", timestamp: "15 Apr 2025, 08:44" },
      { id: "ord-012-evt-8", type: "payment", label: "Transfer proof uploaded", timestamp: "15 Apr 2025, 08:47" },
      { id: "ord-012-evt-9", type: "risk", label: "High-risk flag created", timestamp: "15 Apr 2025, 08:48", status: "danger" },
    ],
  },
  {
    entityType: "return",
    entityId: "RET-001",
    riskScore: 24,
    riskLevel: "low",
    recommendedAction: "Lanjutkan review return standar karena bukti produk dan histori akun relatif aman.",
    sessionRiskState: {
      accessState: "Semi-Trusted",
      sessionRiskLevel: "low",
      otpRequired: false,
      deviceStatus: "known-unusual-network",
      reasons: [
        "Known device terdeteksi, tetapi subnet jaringan sedikit bergeser dari baseline.",
        "Tidak ada abuse pattern pada OTP atau login gagal.",
      ],
    },
    trustedDeviceStatus: {
      deviceLabel: "Customer iPhone Safari",
      browser: "Safari 18",
      os: "iOS 18",
      lastSeen: "13 Apr 2025, 19:44",
      trustLevel: "semi-trusted",
      verificationRequired: false,
      verificationStatus: "Known device with minor network drift",
      trustedDeviceTokenMatch: true,
      fingerprintSimilarity: 88,
      userAgentMatch: true,
      subnetSimilarity: 61,
      reasons: [
        "Device sudah dikenal, hanya jaringan yang berubah tipis.",
      ],
    },
    stepUpConfig: {
      approveReturn: buildStepUpConfig(
        "Approve Return",
        ["Sensitive action requires confirmation.", "Refund decision tetap perlu OTP admin walaupun risikonya rendah."],
        "Verifikasi OTP admin sebelum return diproses."
      ),
      rejectReturn: buildStepUpConfig(
        "Reject Return",
        ["Reject return akan mengubah outcome customer case.", "Aksi ini memerlukan audit confirmation."],
        "Masukkan OTP admin sebelum penolakan return disimpan."
      ),
      resolveHighRiskFlag: buildStepUpConfig(
        "Resolve High Risk Flag",
        ["Status flag memengaruhi histori keamanan case.", "Resolving flag tetap butuh OTP admin."],
        "OTP admin diperlukan untuk mengubah status flag."
      ),
    },
    flags: [
      {
        id: "flag-ret-001-1",
        ruleCode: "RISK-DEVICE-NET",
        title: "Known Device but Unusual Network",
        severity: "low",
        status: "resolved",
        reason: "Akun sempat masuk dari jaringan berbeda, namun device token tetap cocok.",
        createdAt: "14 Apr 2025, 13:10",
      },
    ],
    breakdown: [
      { label: "Known device but unusual network", scoreImpact: 10 },
      { label: "Recent device check before return submission", scoreImpact: 8 },
      { label: "Return evidence complete", scoreImpact: 6 },
    ],
    timeline: [
      { id: "ret-001-evt-1", type: "auth", label: "Login success", timestamp: "14 Apr 2025, 12:58", status: "success" },
      { id: "ret-001-evt-2", type: "device", label: "Trusted device matched", timestamp: "14 Apr 2025, 12:59", status: "success" },
      { id: "ret-001-evt-3", type: "network", label: "Minor network drift detected", timestamp: "14 Apr 2025, 13:00", status: "warning" },
      { id: "ret-001-evt-4", type: "return", label: "Return requested", timestamp: "14 Apr 2025, 13:09" },
      { id: "ret-001-evt-5", type: "proof", label: "Product photos uploaded", timestamp: "14 Apr 2025, 13:12", status: "success" },
      { id: "ret-001-evt-6", type: "risk", label: "Low-risk review completed", timestamp: "14 Apr 2025, 13:15", status: "success" },
    ],
  },
  {
    entityType: "return",
    entityId: "RET-002",
    riskScore: 80,
    riskLevel: "high",
    recommendedAction: "Jangan approve otomatis. Minta bukti tambahan dan validasi unit produk sebelum refund.",
    sessionRiskState: {
      accessState: "OTP Required",
      sessionRiskLevel: "high",
      otpRequired: true,
      deviceStatus: "unrecognized",
      reasons: [
        "Repeated return request berada di atas baseline normal.",
        "Perangkat baru muncul tepat sebelum return diajukan.",
        "Shared IP anomaly dan mismatch QR membuat verification tambahan wajib.",
      ],
    },
    trustedDeviceStatus: {
      deviceLabel: "Unknown Chrome on Windows",
      browser: "Chrome 133",
      os: "Windows 10",
      lastSeen: "Never seen before",
      trustLevel: "new",
      verificationRequired: true,
      verificationStatus: "New / unrecognized device",
      trustedDeviceTokenMatch: false,
      fingerprintSimilarity: 39,
      userAgentMatch: false,
      subnetSimilarity: 24,
      reasons: [
        "Device belum pernah terdaftar pada histori akun customer ini.",
        "User agent dan subnet tidak cocok dengan baseline trusted device.",
      ],
    },
    stepUpConfig: {
      approveReturn: buildStepUpConfig(
        "Approve Return",
        ["High risk return case membutuhkan step-up verification.", "New / unrecognized device terdeteksi.", "Repeated return requests dan QR mismatch masih aktif."],
        "Verifikasi OTP admin dibutuhkan sebelum return bisa disetujui."
      ),
      rejectReturn: buildStepUpConfig(
        "Reject Return",
        ["Sensitive action requires confirmation.", "Current case masih tergolong OTP Required."],
        "Masukkan OTP admin sebelum return ditolak."
      ),
      resolveHighRiskFlag: buildStepUpConfig(
        "Resolve High Risk Flag",
        ["Flag high risk tidak boleh ditutup tanpa OTP tambahan.", "Case memiliki shared IP anomaly dan repeated return requests."],
        "OTP admin diperlukan untuk resolve flag keamanan."
      ),
    },
    flags: [
      {
        id: "flag-ret-002-1",
        ruleCode: "RISK-RETURN-REPEAT",
        title: "Repeated Return Requests",
        severity: "high",
        status: "open",
        reason: "Customer memiliki frekuensi return lebih tinggi dari baseline akun serupa.",
        createdAt: "13 Apr 2025, 16:45",
      },
      {
        id: "flag-ret-002-2",
        ruleCode: "RISK-IP-SHARE",
        title: "Shared IP Anomaly",
        severity: "medium",
        status: "open",
        reason: "Permintaan return berasal dari IP yang juga dipakai akun lain dengan dispute aktif.",
        createdAt: "13 Apr 2025, 16:46",
      },
      {
        id: "flag-ret-002-3",
        ruleCode: "RISK-DEVICE-NEW",
        title: "New Device Detected",
        severity: "high",
        status: "reviewed",
        reason: "Request diajukan dari device baru beberapa menit setelah login.",
        createdAt: "13 Apr 2025, 16:38",
      },
      {
        id: "flag-ret-002-4",
        ruleCode: "RISK-QR-MISMATCH",
        title: "QR Verification Failed",
        severity: "high",
        status: "open",
        reason: "Kode unit yang discan tidak cocok dengan QR produk yang terdaftar di pesanan.",
        createdAt: "13 Apr 2025, 16:52",
      },
    ],
    breakdown: [
      { label: "Repeated return request", scoreImpact: 30 },
      { label: "Shared IP anomaly", scoreImpact: 20 },
      { label: "New device detected", scoreImpact: 15 },
      { label: "QR verification mismatch", scoreImpact: 15 },
    ],
    timeline: [
      { id: "ret-002-evt-1", type: "auth", label: "Login success", timestamp: "13 Apr 2025, 16:34", status: "success" },
      { id: "ret-002-evt-2", type: "device", label: "New device detected", timestamp: "13 Apr 2025, 16:38", status: "danger" },
      { id: "ret-002-evt-3", type: "network", label: "Shared IP anomaly identified", timestamp: "13 Apr 2025, 16:40", status: "warning" },
      { id: "ret-002-evt-4", type: "return", label: "Return requested", timestamp: "13 Apr 2025, 16:44" },
      { id: "ret-002-evt-5", type: "risk", label: "Repeated return request flagged", timestamp: "13 Apr 2025, 16:45", status: "danger" },
      { id: "ret-002-evt-6", type: "proof", label: "Product photos uploaded", timestamp: "13 Apr 2025, 16:49" },
      { id: "ret-002-evt-7", type: "qr", label: "QR verification failed", timestamp: "13 Apr 2025, 16:52", status: "danger" },
      { id: "ret-002-evt-8", type: "step-up", label: "Step-up verification required", timestamp: "13 Apr 2025, 16:53", status: "warning" },
    ],
  },
  {
    entityType: "return",
    entityId: "RET-003",
    riskScore: 65,
    riskLevel: "medium",
    recommendedAction: "Tinjau mismatch QR dan histori login sebelum return diputuskan.",
    sessionRiskState: {
      accessState: "High Risk",
      sessionRiskLevel: "medium",
      otpRequired: true,
      deviceStatus: "known-unusual-network",
      reasons: [
        "Unusual login activity terdeteksi sebelum return dibuat.",
        "Known device digunakan di jaringan yang tidak biasa.",
        "Case tetap membutuhkan OTP sebelum aksi sensitif dilakukan.",
      ],
    },
    trustedDeviceStatus: {
      deviceLabel: "Customer Android App",
      browser: "WebView 132",
      os: "Android 14",
      lastSeen: "05 Apr 2025, 10:18",
      trustLevel: "semi-trusted",
      verificationRequired: true,
      verificationStatus: "Known device, elevated session risk",
      trustedDeviceTokenMatch: true,
      fingerprintSimilarity: 77,
      userAgentMatch: true,
      subnetSimilarity: 36,
      reasons: [
        "Known device masih dikenali, tetapi subnet similarity rendah.",
        "Risk-based authentication menandai sesi ini untuk OTP tambahan.",
      ],
    },
    stepUpConfig: {
      approveReturn: buildStepUpConfig(
        "Approve Return",
        ["Case memiliki unusual login activity.", "Current session tergolong elevated risk dan memerlukan OTP tambahan."],
        "Masukkan OTP admin sebelum return disetujui."
      ),
      rejectReturn: buildStepUpConfig(
        "Reject Return",
        ["Sensitive action requires confirmation.", "Elevated session risk masih aktif pada case ini."],
        "OTP admin diperlukan sebelum return ditolak."
      ),
      resolveHighRiskFlag: buildStepUpConfig(
        "Resolve High Risk Flag",
        ["Open flag masih relevan untuk keputusan review.", "Resolving flag memerlukan OTP pada elevated session."],
        "Verifikasi tambahan diperlukan sebelum flag diselesaikan."
      ),
    },
    flags: [
      {
        id: "flag-ret-003-1",
        ruleCode: "RISK-LOGIN-UNUSUAL",
        title: "Unusual Login Activity",
        severity: "medium",
        status: "open",
        reason: "Akun menunjukkan pola login tidak konsisten dengan histori sebelumnya.",
        createdAt: "12 Apr 2025, 14:14",
      },
      {
        id: "flag-ret-003-2",
        ruleCode: "RISK-QR-MISMATCH",
        title: "QR Verification Failed",
        severity: "high",
        status: "reviewed",
        reason: "Scan QR produk tidak cocok dengan unit yang tercatat pada order.",
        createdAt: "12 Apr 2025, 14:19",
      },
    ],
    breakdown: [
      { label: "Repeated failed login", scoreImpact: 20 },
      { label: "Known device on unusual network", scoreImpact: 15 },
      { label: "QR verification mismatch", scoreImpact: 15 },
      { label: "Step-up verification required", scoreImpact: 15 },
    ],
    timeline: [
      { id: "ret-003-evt-1", type: "auth", label: "Login failed once", timestamp: "12 Apr 2025, 14:06", status: "warning" },
      { id: "ret-003-evt-2", type: "auth", label: "Login success from known device", timestamp: "12 Apr 2025, 14:08", status: "success" },
      { id: "ret-003-evt-3", type: "network", label: "Known device on unusual network", timestamp: "12 Apr 2025, 14:09", status: "warning" },
      { id: "ret-003-evt-4", type: "return", label: "Return requested", timestamp: "12 Apr 2025, 14:13" },
      { id: "ret-003-evt-5", type: "risk", label: "Unusual login activity flagged", timestamp: "12 Apr 2025, 14:14", status: "warning" },
      { id: "ret-003-evt-6", type: "qr", label: "QR verification failed", timestamp: "12 Apr 2025, 14:19", status: "danger" },
      { id: "ret-003-evt-7", type: "step-up", label: "Step-up verification recommended", timestamp: "12 Apr 2025, 14:20", status: "warning" },
    ],
  },
];

const DEFAULT_SUMMARY = {
  order: {
    riskScore: 24,
    riskLevel: "low",
    recommendedAction: "Lanjutkan review pembayaran standar.",
    sessionRiskState: {
      accessState: "Normal Access",
      sessionRiskLevel: "low",
      otpRequired: false,
      deviceStatus: "trusted",
      reasons: [
        "Tidak ada signal keamanan kritis pada sesi ini.",
        "Trusted device dan network match masih berada dalam baseline aman.",
      ],
    },
    trustedDeviceStatus: {
      deviceLabel: "Known Admin Device",
      browser: "Chrome",
      os: "Windows",
      lastSeen: "Recently",
      trustLevel: "trusted",
      verificationRequired: false,
      verificationStatus: "Trusted session confirmed",
      trustedDeviceTokenMatch: true,
      fingerprintSimilarity: 92,
      userAgentMatch: true,
      subnetSimilarity: 88,
      reasons: [
        "Trusted device token cocok.",
      ],
    },
    stepUpConfig: {
      approvePayment: buildStepUpConfig(
        "Approve Payment",
        ["Sensitive action requires confirmation."],
        "OTP admin diperlukan sebelum approval diproses."
      ),
      rejectPayment: buildStepUpConfig(
        "Reject Payment",
        ["Sensitive action requires confirmation."],
        "OTP admin diperlukan sebelum penolakan disimpan."
      ),
      resolveHighRiskFlag: buildStepUpConfig(
        "Resolve High Risk Flag",
        ["Resolving security flag memerlukan audit confirmation."],
        "OTP admin diperlukan sebelum flag diselesaikan."
      ),
    },
    flags: [],
    breakdown: [
      { label: "Normal access baseline", scoreImpact: 8 },
      { label: "Trusted device detected", scoreImpact: 8 },
      { label: "No abnormal OTP or login pattern", scoreImpact: 8 },
    ],
    timeline: [
      { id: "default-order-1", type: "auth", label: "Login success", timestamp: "Today, 09:10", status: "success" },
      { id: "default-order-2", type: "device", label: "Trusted device matched", timestamp: "Today, 09:11", status: "success" },
      { id: "default-order-3", type: "order", label: "Order created", timestamp: "Today, 09:14" },
      { id: "default-order-4", type: "payment", label: "Transfer proof uploaded", timestamp: "Today, 09:18" },
    ],
  },
  return: {
    riskScore: 28,
    riskLevel: "low",
    recommendedAction: "Lanjutkan review return standar sambil cek bukti pendukung.",
    sessionRiskState: {
      accessState: "Semi-Trusted",
      sessionRiskLevel: "low",
      otpRequired: false,
      deviceStatus: "known-unusual-network",
      reasons: [
        "Case masih berada di baseline aman dengan minor network drift.",
      ],
    },
    trustedDeviceStatus: {
      deviceLabel: "Known Customer Device",
      browser: "Safari",
      os: "iOS",
      lastSeen: "Recently",
      trustLevel: "semi-trusted",
      verificationRequired: false,
      verificationStatus: "Known device with minor drift",
      trustedDeviceTokenMatch: true,
      fingerprintSimilarity: 85,
      userAgentMatch: true,
      subnetSimilarity: 62,
      reasons: [
        "Device dikenal, tetapi jaringan sedikit bergeser.",
      ],
    },
    stepUpConfig: {
      approveReturn: buildStepUpConfig(
        "Approve Return",
        ["Sensitive action requires confirmation."],
        "OTP admin diperlukan sebelum return diproses."
      ),
      rejectReturn: buildStepUpConfig(
        "Reject Return",
        ["Sensitive action requires confirmation."],
        "OTP admin diperlukan sebelum penolakan return disimpan."
      ),
      resolveHighRiskFlag: buildStepUpConfig(
        "Resolve High Risk Flag",
        ["Resolving security flag memerlukan audit confirmation."],
        "OTP admin diperlukan sebelum flag diselesaikan."
      ),
    },
    flags: [],
    breakdown: [
      { label: "Return evidence appears complete", scoreImpact: 10 },
      { label: "Known device baseline still acceptable", scoreImpact: 9 },
      { label: "No critical abuse signal detected", scoreImpact: 9 },
    ],
    timeline: [
      { id: "default-return-1", type: "auth", label: "Login success", timestamp: "Today, 13:02", status: "success" },
      { id: "default-return-2", type: "device", label: "Known device matched", timestamp: "Today, 13:03", status: "success" },
      { id: "default-return-3", type: "return", label: "Return requested", timestamp: "Today, 13:08" },
      { id: "default-return-4", type: "proof", label: "Supporting evidence uploaded", timestamp: "Today, 13:11", status: "success" },
    ],
  },
};

export function getCaseRiskSummary(entityType, entityId) {
  const summary = CASE_RISK_SUMMARIES.find(
    (item) => item.entityType === entityType && item.entityId === entityId
  );

  if (summary) return clone(summary);

  return clone({
    entityType,
    entityId,
    ...DEFAULT_SUMMARY[entityType],
  });
}

export function getMonitoringSummary() {
  const totalFlaggedCases = CASE_RISK_SUMMARIES.filter((item) => item.flags.length > 0).length;
  const highRiskCases = CASE_RISK_SUMMARIES.filter((item) => item.riskLevel === "high").length;
  const pendingReview = CASE_RISK_SUMMARIES.filter((item) =>
    item.flags.some((flag) => flag.status === "open")
  ).length;
  const resolvedFlags = CASE_RISK_SUMMARIES.reduce(
    (count, item) => count + item.flags.filter((flag) => flag.status === "resolved").length,
    0
  );

  return {
    totalFlaggedCases,
    highRiskCases,
    pendingReview,
    resolvedFlags,
  };
}

export { CASE_RISK_SUMMARIES };
