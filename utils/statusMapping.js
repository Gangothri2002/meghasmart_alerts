/**
 * Status Mapping Utility
 * Defines device status values, labels, colors, and utilities
 */

// Device Status Constants
const STATUS = {
  INITIALIZE: 1,
  NO_COMMUNICATION: 2,
  ALERT: 3,
  GOOD: 4,
  PANIC_ALERT: 5
};

// Status Configuration with labels and colors
const STATUS_CONFIG = {
  1: {
    value: 1,
    label: 'Initialize',
    color: '#3b82f6',      // Blue
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    cssClass: 'status-initialize',
    icon: '🔵'
  },
  2: {
    value: 2,
    label: 'No Communication',
    color: '#f59e0b',      // Yellow/Amber
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    cssClass: 'status-no-communication',
    icon: '🟡'
  },
  3: {
    value: 3,
    label: 'Alert',
    color: '#ef4444',      // Red
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    cssClass: 'status-alert',
    icon: '🔴'
  },
  4: {
    value: 4,
    label: 'Good',
    color: '#10b981',      // Green
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    cssClass: 'status-good',
    icon: '🟢'
  },
  5: {
    value: 5,
    label: 'Panic Alert',
    color: '#dc2626',      // Strong Red
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    cssClass: 'status-panic',
    icon: '🚨'
  }
};

/**
 * Get status configuration by status value
 * @param {number} statusValue - The numeric status value (1-5)
 * @returns {object} The status configuration object
 */
function getStatusConfig(statusValue) {
  return STATUS_CONFIG[statusValue] || STATUS_CONFIG[1]; // Default to Initialize
}

/**
 * Get status label by status value
 * @param {number} statusValue - The numeric status value (1-5)
 * @returns {string} The human-readable status label
 */
function getStatusLabel(statusValue) {
  const config = getStatusConfig(statusValue);
  return config.label;
}

/**
 * Get status color by status value
 * @param {number} statusValue - The numeric status value (1-5)
 * @returns {string} The hex color code
 */
function getStatusColor(statusValue) {
  const config = getStatusConfig(statusValue);
  return config.color;
}

/**
 * Get CSS class for status
 * @param {number} statusValue - The numeric status value (1-5)
 * @returns {string} The CSS class name
 */
function getStatusClass(statusValue) {
  const config = getStatusConfig(statusValue);
  return config.cssClass;
}

/**
 * Format status for display (label + icon)
 * @param {number} statusValue - The numeric status value (1-5)
 * @returns {string} The formatted status string
 */
function formatStatus(statusValue) {
  const config = getStatusConfig(statusValue);
  return `${config.icon} ${config.label}`;
}

/**
 * Convert old string status to new numeric status
 * @param {string} oldStatus - The old status string ('Active', 'Inactive', etc.)
 * @returns {number} The new numeric status value
 */
function convertStatusToNumeric(oldStatus) {
  if (!oldStatus) return STATUS.INITIALIZE;
  
  const normalized = String(oldStatus).toLowerCase().trim();
  const numericValue = parseInt(normalized, 10);
  if (!Number.isNaN(numericValue) && [1, 2, 3, 4, 5].includes(numericValue)) {
    return numericValue;
  }

  switch (normalized) {
    case 'active':
    case 'good':
      return STATUS.GOOD;
    case 'inactive':
    case 'no communication':
      return STATUS.NO_COMMUNICATION;
    case 'alert':
    case 'error':
      return STATUS.ALERT;
    case 'panic':
    case 'panic alert':
    case 'panic-alert':
    case 'panic_alert':
    case 'critical':
      return STATUS.PANIC_ALERT;
    case 'initialize':
    case 'initializing':
    case 'new':
      return STATUS.INITIALIZE;
    default:
      return STATUS.INITIALIZE;
  }
}

module.exports = {
  STATUS,
  STATUS_CONFIG,
  getStatusConfig,
  getStatusLabel,
  getStatusColor,
  getStatusClass,
  formatStatus,
  convertStatusToNumeric
};
