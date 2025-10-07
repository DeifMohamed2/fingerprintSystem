const path = require('path');
const fs = require('fs');
const wasender = require('./wasender');

// Default sender/admin phone that owns the active WhatsApp session
const DEFAULT_ADMIN_PHONE = '01156012078';
// Base URL to serve public files (Excel, etc.)
const APP_BASE_URL =  'https://attendance-fingerprint-system.online';

function normalizeEgyptNumber(rawPhone, countryCode = '20') {
  const phoneAsString = (typeof rawPhone === 'string' ? rawPhone : String(rawPhone || '')).trim();
  if (!phoneAsString) return null;
  let cleaned = phoneAsString.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
  let cc = String(countryCode || '20').replace(/^0+/, '');
  let combined = `${cc}${cleaned}`.replace(/\D/g, '');
  if (!combined.startsWith('2')) combined = `2${combined}`; // ensure leading country indicator for EG
  return combined;
}

function toJid(phone, countryCode = '20') {
  const normalized = normalizeEgyptNumber(phone, countryCode);
  if (!normalized) return null;
  return `${normalized}@s.whatsapp.net`;
}

async function getTargetSession(adminPhone) {
  const sessionsResponse = await wasender.getAllSessions();
  if (!sessionsResponse.success) {
    throw new Error(`Failed to get sessions: ${sessionsResponse.message}`);
  }
  const sessions = sessionsResponse.data || [];
  const admin = (adminPhone || DEFAULT_ADMIN_PHONE).replace(/\D/g, '');
  const normalized = [admin, `20${admin.replace(/^0/, '')}`, `+20${admin.replace(/^0/, '')}`].map(v => v.replace(/\D/g, ''));
  const target = sessions.find(s => normalized.includes((s.phone_number || '').replace(/\D/g, '')));
  if (!target) throw new Error('Admin WhatsApp session not found for the required number');
  if (!target.api_key) throw new Error('Session API key not available');
  return target;
}

async function getAdminSessionStrict() {
  return await getTargetSession(DEFAULT_ADMIN_PHONE);
}

async function connectAdminSession() {
  const sessionsResponse = await wasender.getAllSessions();
  if (!sessionsResponse.success) return sessionsResponse;
  const sessions = sessionsResponse.data || [];
  const admin = DEFAULT_ADMIN_PHONE.replace(/\D/g, '');
  const normalized = [admin, `20${admin.replace(/^0/, '')}`, `+20${admin.replace(/^0/, '')}`].map(v => v.replace(/\D/g, ''));
  const target = sessions.find(s => normalized.includes((s.phone_number || '').replace(/\D/g, '')));
  if (!target) return { success: false, message: 'Admin WhatsApp session not found' };
  return await wasender.connectSession(target.id);
}

async function getAdminQRCode() {
  const sessionsResponse = await wasender.getAllSessions();
  if (!sessionsResponse.success) return sessionsResponse;
  const sessions = sessionsResponse.data || [];
  const admin = DEFAULT_ADMIN_PHONE.replace(/\D/g, '');
  const normalized = [admin, `20${admin.replace(/^0/, '')}`, `+20${admin.replace(/^0/, '')}`].map(v => v.replace(/\D/g, ''));
  const target = sessions.find(s => normalized.includes((s.phone_number || '').replace(/\D/g, '')));
  if (!target) return { success: false, message: 'Admin WhatsApp session not found' };
  return await wasender.getQRCode(target.id);
}

async function sendWasenderMessage(message, phone, adminPhone, isExcel = false, countryCode = '20') {
  try {
    const phoneAsString = (typeof phone === 'string' ? phone : String(phone || '')).trim();
    if (!phoneAsString) {
      return { success: false, message: 'No phone number provided' };
    }
    const targetSession = await getTargetSession(adminPhone);
    const jid = toJid(phoneAsString, countryCode);
    if (!jid) return { success: false, message: 'Invalid phone number' };
    const response = await wasender.sendTextMessage(targetSession.api_key, jid, message);
    return response;
  } catch (err) {
    return { success: false, message: err.message };
  }
}

async function sendQRMessage(studentCode, phone, adminPhone, countryCode = '20', captionPrefix = 'Scan the QR code to check in') {
  try {
    const targetSession = await getTargetSession(adminPhone);
    const jid = toJid(phone, countryCode);
    if (!jid) return { success: false, message: 'Invalid phone number' };
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(studentCode)}`;
    const caption = `${captionPrefix}`;
    const response = await wasender.sendImageMessage(targetSession.api_key, jid, qrUrl, caption);
    return response;
  } catch (err) {
    return { success: false, message: err.message };
  }
}

async function sendExcelFile(buffer, fileName, phone, adminPhone, countryCode = '20', caption = '') {
  try {
    // Ensure export dir exists under public
    const exportDir = path.join(process.cwd(), 'public', 'exports');
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
    // Save file locally to be served via static hosting
    const filePath = path.join(exportDir, fileName);
    fs.writeFileSync(filePath, buffer);
    const publicUrlPrimary = `${APP_BASE_URL}/exports/${encodeURIComponent(fileName)}`;
    const publicUrlFallback = `http://localhost:8600/exports/${encodeURIComponent(fileName)}`;

    const targetSession = await getTargetSession(adminPhone);
    const jid = toJid(phone, countryCode);
    if (!jid) return { success: false, message: 'Invalid phone number' };

    // Preferred path: upload media to Wasender and send by media id/url
    try {
      const upload = await wasender.uploadMedia(targetSession.api_key, Buffer.from(buffer), fileName, 'document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      if (upload?.success) {
        const mediaUrl = upload.data?.url || upload.data?.mediaUrl || publicUrlPrimary;
        const resp = await wasender.sendDocumentMessage(targetSession.api_key, jid, mediaUrl, fileName);
        if (resp?.success) return resp;
      }
    } catch (e) {
      // fallthrough to direct URL
    }

    // Fallback: send document via public URL (primary then localhost)
    let response = await wasender.sendDocumentMessage(targetSession.api_key, jid, publicUrlPrimary, fileName);
    if (!response?.success) {
      try {
        response = await wasender.sendDocumentMessage(targetSession.api_key, jid, publicUrlFallback, fileName);
      } catch (e) {}
    }
    return response;
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// Simplest path: save to public and send documentUrl directly (no upload)
async function sendExcelFileSimple(buffer, fileName, phone, adminPhone, countryCode = '20') {
  try {
    const exportDir = path.join(process.cwd(), 'public', 'exports');
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
    const filePath = path.join(exportDir, fileName);
    fs.writeFileSync(filePath, buffer);
    const publicUrlPrimary = `${APP_BASE_URL}/exports/${encodeURIComponent(fileName)}`;
    const publicUrlFallback = `http://localhost:8600/exports/${encodeURIComponent(fileName)}`;

    const targetSession = await getTargetSession(adminPhone);
    const jid = toJid(phone, countryCode);
    if (!jid) return { success: false, message: 'Invalid phone number' };

    let response = await wasender.sendDocumentMessage(targetSession.api_key, jid, publicUrlPrimary, fileName);
    if (!response?.success) {
      try {
        response = await wasender.sendDocumentMessage(targetSession.api_key, jid, publicUrlFallback, fileName);
      } catch (e) {}
    }
    return response;
  } catch (err) {
    return { success: false, message: err.message };
  }
}

module.exports = {
  DEFAULT_ADMIN_PHONE,
  sendWasenderMessage,
  sendQRMessage,
  sendExcelFile,
  toJid,
  normalizeEgyptNumber,
  getAdminSessionStrict,
  connectAdminSession,
  getAdminQRCode,
  sendExcelFileSimple,
};


