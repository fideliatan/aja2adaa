import { recommendedAction } from "../lib/riskEngine.js";

const clone = (value) => JSON.parse(JSON.stringify(value));

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatTimestamp(value) {
  if (!value) return "Unknown";
  return DATE_TIME_FORMATTER.format(new Date(value));
}

function timeAgo(value) {
  if (!value) return "Unknown";

  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60000));

  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days} days ago`;

  const months = Math.round(days / 30);
  return `${months} mo ago`;
}

function buildStepUpConfig(actionLabel, reasons, helperText) {
  return {
    actionLabel,
    reasons,
    helperText,
  };
}

function buildActionReasons(riskSummary, sessionRiskState, entityType, actionLabel) {
  const reasons = [];

  if (riskSummary.level === "high") {
    reasons.push("High risk case requires additional verification.");
  } else if (riskSummary.level === "medium") {
    reasons.push("Case has elevated risk signals and should be confirmed.");
  } else {
    reasons.push("Sensitive action should still be verified for audit purposes.");
  }

  const topBreakdown = [...(riskSummary.breakdown ?? [])]
    .sort((left, right) => right.scoreImpact - left.scoreImpact)
    .slice(0, 2)
    .map((item) => item.label);

  if (topBreakdown.length > 0) {
    reasons.push(`Primary signals: ${topBreakdown.join(", ")}.`);
  }

  if (sessionRiskState.otpRequired) {
    reasons.push("The related session is marked for OTP-based step-up verification.");
  }

  return {
    approve:
      entityType === "order"
        ? buildStepUpConfig(
            actionLabel,
            reasons,
            "Enter admin OTP to continue. Testing code: 123456."
          )
        : buildStepUpConfig(
            actionLabel,
            reasons,
            "Enter admin OTP to continue. Testing code: 123456."
          ),
    reject: buildStepUpConfig(
      actionLabel,
      reasons,
      "Enter admin OTP to continue. Testing code: 123456."
    ),
    resolve: buildStepUpConfig(
      actionLabel,
      reasons,
      "Enter admin OTP to resolve this flag. Testing code: 123456."
    ),
  };
}

function buildSessionRiskState(summary, entity) {
  const deviceStatus = entity?.sessionSnapshot?.deviceStatus ?? "trusted";
  const accessState =
    summary.level === "high"
      ? "OTP Required"
      : summary.level === "medium" || deviceStatus === "known-unusual-network"
        ? "Semi-Trusted"
        : "Normal Access";

  const reasons = [];

  if ((summary.breakdown ?? []).length === 0) {
    reasons.push("No critical security signals are active for this case.");
  } else {
    summary.breakdown.forEach((item) => {
      reasons.push(item.label);
    });
  }

  if (deviceStatus === "new") {
    reasons.unshift("A new or unrecognized device was involved in this flow.");
  }

  return {
    accessState,
    sessionRiskLevel: summary.level,
    otpRequired: summary.level === "high" || deviceStatus === "new",
    deviceStatus,
    reasons,
  };
}

function buildTrustedDeviceStatus(mockStore, entity) {
  const snapshot = entity?.sessionSnapshot ?? {};
  const userId = snapshot.userId ?? entity?.customerId ?? entity?.id ?? null;
  const matchedDevice = mockStore.trustedDevices
    .filter((device) => device.userId === userId)
    .find(
      (device) =>
        device.id === snapshot.deviceInfo?.trustedDeviceId ||
        device.deviceToken === snapshot.deviceInfo?.trustedDeviceId
    );

  const deviceStatus = snapshot.deviceStatus ?? "trusted";
  const trustLevel =
    deviceStatus === "new"
      ? "new"
      : deviceStatus === "known-unusual-network"
        ? "semi-trusted"
        : "trusted";

  const deviceLabel =
    snapshot.deviceInfo?.deviceLabel ??
    matchedDevice?.deviceLabel ??
    "Current browser session";
  const userAgent =
    snapshot.deviceInfo?.userAgent ?? matchedDevice?.userAgent ?? "";
  const browser = userAgent.includes("Chrome")
    ? "Chrome"
    : userAgent.includes("Safari")
      ? "Safari"
      : userAgent.includes("Firefox")
        ? "Firefox"
        : userAgent.includes("Edge")
          ? "Edge"
          : "Browser";
  const os = userAgent.includes("Windows")
    ? "Windows"
    : userAgent.includes("Android")
      ? "Android"
      : userAgent.includes("iPhone") || userAgent.includes("iOS")
        ? "iOS"
        : userAgent.includes("Mac")
          ? "macOS"
          : "Unknown OS";

  return {
    deviceLabel,
    browser,
    os,
    lastSeen: formatTimestamp(
      matchedDevice?.lastSeenAt ?? entity?.updatedAt ?? entity?.createdAt
    ),
    trustLevel,
    verificationRequired:
      trustLevel !== "trusted" || (entity?.riskSummary?.score ?? 0) >= 70,
    verificationStatus:
      trustLevel === "new"
        ? "New / unrecognized device"
        : trustLevel === "semi-trusted"
          ? "Known device, unusual network"
          : "Trusted session confirmed",
    trustedDeviceTokenMatch: Boolean(
      matchedDevice?.deviceToken && snapshot.deviceInfo?.trustedDeviceId
    ),
    fingerprintSimilarity:
      snapshot.deviceInfo?.fingerprintSimilarity ??
      matchedDevice?.fingerprintSimilarity ??
      0,
    userAgentMatch:
      snapshot.deviceInfo?.userAgentMatch ?? matchedDevice?.userAgentMatch ?? false,
    subnetSimilarity:
      snapshot.deviceInfo?.subnetSimilarity ?? matchedDevice?.subnetSimilarity ?? 0,
    reasons: [
      trustLevel === "new"
        ? "No trusted device token was matched for this flow."
        : trustLevel === "semi-trusted"
          ? "The device is known but the network baseline drifted."
          : "Trusted device and session baseline still match.",
      `Fingerprint similarity: ${
        snapshot.deviceInfo?.fingerprintSimilarity ??
        matchedDevice?.fingerprintSimilarity ??
        0
      }%.`,
    ],
  };
}

function mapEventStatus(eventType, metadata = {}) {
  if (
    eventType.includes("failed") ||
    eventType.includes("rejected") ||
    eventType.includes("flag_created")
  ) {
    return "danger";
  }

  if (
    eventType.includes("requested") ||
    eventType.includes("flagged") ||
    eventType.includes("unusual") ||
    metadata.reason
  ) {
    return "warning";
  }

  return "success";
}

function buildTimeline(mockStore, entityType, entityId) {
  const entity =
    entityType === "order"
      ? mockStore.orders.find((item) => item.id === entityId)
      : mockStore.returns.find((item) => item.id === entityId);
  const relatedOrderId = entity?.orderId ?? entityId;

  const activityItems = (mockStore.activityTimeline ?? [])
    .filter((event) => {
      const metadata = event.metadata ?? {};
      return (
        (metadata.entityType === entityType && metadata.entityId === entityId) ||
        (entityType === "order" && metadata.orderId === entityId) ||
        (entityType === "return" &&
          (metadata.entityId === entityId || metadata.orderId === relatedOrderId))
      );
    })
    .map((event) => ({
      id: event.id,
      type: event.eventType.split("_")[0],
      label: event.label,
      timestamp: formatTimestamp(event.timestamp),
      rawTimestamp: event.timestamp,
      status: mapEventStatus(event.eventType, event.metadata ?? {}),
    }));

  const statusChanges = (mockStore.approvalStatusChanges ?? [])
    .filter(
      (change) => change.entityType === entityType && change.entityId === entityId
    )
    .map((change) => ({
      id: change.id,
      type: "action",
      label: change.note ?? `${change.fromStatus ?? "new"} -> ${change.toStatus}`,
      timestamp: formatTimestamp(change.createdAt),
      rawTimestamp: change.createdAt,
      status: "success",
    }));

  const entityHistory = (entity?.statusHistory ?? []).map((entry) => ({
    id: entry.id,
    type: entityType,
    label: entry.note ?? `${entityType} status updated to ${entry.status}`,
    timestamp: formatTimestamp(entry.createdAt),
    rawTimestamp: entry.createdAt,
    status: "success",
  }));

  return [...activityItems, ...statusChanges, ...entityHistory]
    .sort(
      (left, right) =>
        new Date(left.rawTimestamp).getTime() - new Date(right.rawTimestamp).getTime()
    )
    .map(({ rawTimestamp, ...item }) => item);
}

function buildFlags(mockStore, entityType, entityId) {
  return (mockStore.monitoringFlags ?? [])
    .filter((flag) => flag.entityType === entityType && flag.entityId === entityId)
    .map((flag) => ({
      ...flag,
      createdAt: formatTimestamp(flag.createdAt),
    }));
}

function buildDefaultSummary(entityType, entityId) {
  const baseSummary = {
    entityType,
    entityId,
    riskScore: 0,
    riskLevel: "low",
    recommendedAction: recommendedAction("low"),
    sessionRiskState: {
      accessState: "Normal Access",
      sessionRiskLevel: "low",
      otpRequired: false,
      deviceStatus: "trusted",
      reasons: ["No active risk signals found for this case."],
    },
    trustedDeviceStatus: {
      deviceLabel: "Current browser session",
      browser: "Browser",
      os: "Unknown OS",
      lastSeen: "Unknown",
      trustLevel: "trusted",
      verificationRequired: false,
      verificationStatus: "Trusted session confirmed",
      trustedDeviceTokenMatch: false,
      fingerprintSimilarity: 0,
      userAgentMatch: false,
      subnetSimilarity: 0,
      reasons: ["No trusted device snapshot is available yet."],
    },
    stepUpConfig: {
      approvePayment: buildStepUpConfig(
        "Approve Payment",
        ["Sensitive action requires confirmation."],
        "Enter admin OTP to continue. Testing code: 123456."
      ),
      rejectPayment: buildStepUpConfig(
        "Reject Payment",
        ["Sensitive action requires confirmation."],
        "Enter admin OTP to continue. Testing code: 123456."
      ),
      approveReturn: buildStepUpConfig(
        "Approve Return",
        ["Sensitive action requires confirmation."],
        "Enter admin OTP to continue. Testing code: 123456."
      ),
      rejectReturn: buildStepUpConfig(
        "Reject Return",
        ["Sensitive action requires confirmation."],
        "Enter admin OTP to continue. Testing code: 123456."
      ),
      resolveHighRiskFlag: buildStepUpConfig(
        "Resolve High Risk Flag",
        ["Resolving a security flag requires confirmation."],
        "Enter admin OTP to continue. Testing code: 123456."
      ),
    },
    flags: [],
    breakdown: [],
    timeline: [],
  };

  return clone(baseSummary);
}

export function getCaseRiskSummary(mockStore, entityType, entityId) {
  if (!mockStore) {
    return buildDefaultSummary(entityType, entityId);
  }

  const entity =
    entityType === "order"
      ? mockStore.orders.find((item) => item.id === entityId)
      : mockStore.returns.find((item) => item.id === entityId);

  if (!entity) {
    return buildDefaultSummary(entityType, entityId);
  }

  const summary = entity.riskSummary ?? {
    score: 0,
    level: "low",
    breakdown: [],
  };

  const sessionRiskState = buildSessionRiskState(summary, entity);
  const trustedDeviceStatus = buildTrustedDeviceStatus(mockStore, entity);
  const flags = buildFlags(mockStore, entityType, entityId);
  const timeline = buildTimeline(mockStore, entityType, entityId);
  const actionReasons = buildActionReasons(summary, sessionRiskState, entityType, "");

  return {
    entityType,
    entityId,
    riskScore: summary.score ?? 0,
    riskLevel: summary.level ?? "low",
    recommendedAction: recommendedAction(summary.level ?? "low"),
    sessionRiskState,
    trustedDeviceStatus,
    stepUpConfig: {
      approvePayment: buildStepUpConfig(
        "Approve Payment",
        actionReasons.approve.reasons,
        actionReasons.approve.helperText
      ),
      rejectPayment: buildStepUpConfig(
        "Reject Payment",
        actionReasons.reject.reasons,
        actionReasons.reject.helperText
      ),
      approveReturn: buildStepUpConfig(
        "Approve Return",
        actionReasons.approve.reasons,
        actionReasons.approve.helperText
      ),
      rejectReturn: buildStepUpConfig(
        "Reject Return",
        actionReasons.reject.reasons,
        actionReasons.reject.helperText
      ),
      resolveHighRiskFlag: buildStepUpConfig(
        "Resolve High Risk Flag",
        actionReasons.resolve.reasons,
        actionReasons.resolve.helperText
      ),
    },
    flags,
    breakdown: summary.breakdown ?? [],
    timeline,
  };
}

export function getMonitoringSummary(mockStore) {
  if (!mockStore) {
    return {
      totalFlaggedCases: 0,
      highRiskCases: 0,
      pendingReview: 0,
      resolvedFlags: 0,
    };
  }

  const uniqueFlaggedCases = new Set(
    (mockStore.monitoringFlags ?? []).map(
      (flag) => `${flag.entityType}:${flag.entityId}`
    )
  );

  const orderHighRisk = (mockStore.orders ?? []).filter(
    (order) => (order.riskSummary?.level ?? "low") === "high"
  ).length;
  const returnHighRisk = (mockStore.returns ?? []).filter(
    (ret) => (ret.riskSummary?.level ?? "low") === "high"
  ).length;
  const accountHighRisk = (mockStore.users ?? []).filter(
    (user) => (user.riskSummary?.level ?? "low") === "high"
  ).length;

  return {
    totalFlaggedCases: uniqueFlaggedCases.size,
    highRiskCases: orderHighRisk + returnHighRisk + accountHighRisk,
    pendingReview: (mockStore.monitoringFlags ?? []).filter(
      (flag) => flag.status === "open"
    ).length,
    resolvedFlags: (mockStore.monitoringFlags ?? []).filter(
      (flag) => flag.status === "resolved"
    ).length,
  };
}

function mapActivityToNotification(event) {
  if (event.eventType.startsWith("order_")) {
    return {
      type: event.eventType === "order_shipped" ? "shipped" : "order",
      title:
        event.eventType === "order_approved"
          ? "Order approved"
          : event.eventType === "order_rejected"
            ? "Order rejected"
            : event.eventType === "order_shipped"
              ? "Order shipped"
              : event.eventType === "order_delivered"
                ? "Order delivered"
                : "Order activity",
    };
  }

  if (event.eventType.startsWith("return_") || event.eventType === "qr_verified") {
    return {
      type: "return",
      title: "Return activity",
    };
  }

  if (
    event.eventType.includes("payment") ||
    event.eventType.includes("otp") ||
    event.eventType.includes("login")
  ) {
    return {
      type: "payment",
      title: "Security / payment activity",
    };
  }

  return {
    type: "review",
    title: "System activity",
  };
}

export function getAdminNotifications(mockStore) {
  if (!mockStore) return [];

  return (mockStore.activityTimeline ?? [])
    .slice(0, 20)
    .map((event) => {
      const mapped = mapActivityToNotification(event);
      return {
        id: event.id,
        type: mapped.type,
        title: mapped.title,
        body: event.label,
        time: timeAgo(event.timestamp),
        read: false,
      };
    });
}
