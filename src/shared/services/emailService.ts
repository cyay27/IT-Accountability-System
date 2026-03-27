/**
 * Email Service using EmailJS
 * Send notifications for important events
 */

import emailjs from 'emailjs-com';

// Initialize EmailJS (set your service ID and public key)
const EMAIL_SERVICE_ID = process.env.REACT_APP_EMAIL_SERVICE_ID || 'service_YOUR_ID';
const EMAIL_TEMPLATE_ID = process.env.REACT_APP_EMAIL_TEMPLATE_ID || 'template_YOUR_ID';
const EMAIL_PUBLIC_KEY = process.env.REACT_APP_EMAIL_PUBLIC_KEY || 'YOUR_PUBLIC_KEY';

// Initialize emailjs once
try {
  emailjs.init(EMAIL_PUBLIC_KEY);
} catch (error) {
  console.log('EmailJS initialization skipped (not configured for development)');
}

export interface EmailParams {
  to_email: string;
  subject: string;
  message: string;
  user_name: string;
  [key: string]: string;
}

/**
 * Send email notification
 */
export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    if (!EMAIL_PUBLIC_KEY.includes('YOUR')) {
      const response = await emailjs.send(EMAIL_SERVICE_ID, EMAIL_TEMPLATE_ID, params);
      return response.status === 200;
    }
    console.log('Email service not configured. Would send:', params);
    return true; // Pretend it sent for development
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Send license expiration warning
 */
export async function sendLicenseExpirationAlert(
  email: string,
  userName: string,
  softwareName: string,
  expiryDate: string
): Promise<boolean> {
  return sendEmail({
    to_email: email,
    subject: `License Expiration Alert: ${softwareName}`,
    message: `The license for ${softwareName} is expiring on ${expiryDate}. Please renew it.`,
    user_name: userName,
  });
}

/**
 * Send asset return reminder
 */
export async function sendAssetReturnReminder(
  email: string,
  userName: string,
  assetName: string,
  dueDate: string
): Promise<boolean> {
  return sendEmail({
    to_email: email,
    subject: `Asset Return Reminder: ${assetName}`,
    message: `Please return the asset "${assetName}" by ${dueDate}.`,
    user_name: userName,
  });
}

/**
 * Send record submission confirmation
 */
export async function sendRecordSubmissionConfirmation(
  email: string,
  userName: string,
  recordType: string,
  recordId: string
): Promise<boolean> {
  return sendEmail({
    to_email: email,
    subject: `${recordType} Submission Confirmation`,
    message: `Your ${recordType} (ID: ${recordId}) has been submitted successfully.`,
    user_name: userName,
  });
}

/**
 * Send bulk notification to multiple users
 */
export async function sendBulkNotification(
  emails: string[],
  subject: string,
  message: string
): Promise<number> {
  let successCount = 0;

  for (const email of emails) {
    const result = await sendEmail({
      to_email: email,
      subject,
      message,
      user_name: 'User',
    });
    if (result) successCount++;
  }

  return successCount;
}

/**
 * Check if email service is configured
 */
export function isEmailServiceConfigured(): boolean {
  return !EMAIL_PUBLIC_KEY.includes('YOUR');
}
