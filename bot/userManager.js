const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const USERS_FILE = path.join(__dirname, 'users.json');
const ALLOWED_USERS = (process.env.ALLOWED_USERS || '').split(',').map(u => u.trim());

// Encryption settings
const ALGORITHM = 'aes-256-cbc';
// Ensure the key is 32 bytes. We use a hash of the env key to guarantee length.
const KEY = crypto.createHash('sha256').update(String(process.env.ENCRYPTION_KEY || 'default-insecure-key')).digest();

function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
    if (!text) return null;
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = parts.join(':');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

function loadStore() {
    if (fs.existsSync(USERS_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        } catch (e) {
            console.error("Failed to load users store:", e);
        }
    }

    return { users: {} };
}

function saveStore(store) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(store, null, 2));
}

function isUserAllowed(userId) {
    if (ALLOWED_USERS.includes(userId)) return true;
    const store = loadStore();
    return store.users?.[userId]?.status === 'approved';
}

function addApprovedUser(userId) {
    const store = loadStore();
    if (!store.users[userId]) store.users[userId] = {};
    store.users[userId].status = 'approved';
    saveStore(store);
}

function removeApprovedUser(userId) {
    const store = loadStore();
    if (!store.users[userId] || store.users[userId].status !== 'approved') {
        return false;
    }
    store.users[userId].status = 'revoked';
    saveStore(store);
    return true;
}

function getAllowedUsers() {
    const store = loadStore();
    const approvedUsers = Object.entries(store.users || {})
        .filter(([, data]) => data.status === 'approved')
        .map(([userId]) => userId);
    const pendingUsers = Object.entries(store.users || {})
        .filter(([, data]) => data.status === 'pending')
        .map(([userId]) => userId);
    const rejectedUsers = Object.entries(store.users || {})
        .filter(([, data]) => data.status === 'rejected')
        .map(([userId]) => userId);
    return {
        envUsers: ALLOWED_USERS.filter(Boolean),
        approvedUsers,
        pendingUsers,
        rejectedUsers
    };
}

function registerUser(userId, segaId, password) {
    if (!isUserAllowed(userId)) {
        throw new Error("User not authorized to use this bot.");
    }
    const store = loadStore();
    if (!store.users[userId]) store.users[userId] = {};
    store.users[userId].credentials = {
        segaId: encrypt(segaId),
        password: encrypt(password)
    };
    saveStore(store);
}

function getCredentials(userId) {
    if (!isUserAllowed(userId)) {
        throw new Error("User not authorized.");
    }
    const store = loadStore();
    const user = store.users?.[userId];
    if (!user || !user.credentials) return null;

    return {
        segaId: decrypt(user.credentials.segaId),
        password: decrypt(user.credentials.password)
    };
}

function createAccessRequest(userId, segaId, reason) {
    const store = loadStore();
    if (!store.users[userId]) store.users[userId] = {};
    store.users[userId].status = 'pending';
    store.users[userId].lastRequest = { segaId, reason, createdAt: new Date().toISOString() };
    saveStore(store);
    return userId;
}

function getAccessRequest(requestId) {
    const store = loadStore();
    const user = store.users?.[requestId];
    if (!user || user.status !== 'pending' || !user.lastRequest) return null;
    return {
        userId: requestId,
        segaId: user.lastRequest.segaId || '',
        reason: user.lastRequest.reason || '',
        createdAt: user.lastRequest.createdAt || ''
    };
}

function approveAccessRequest(requestId) {
    const store = loadStore();
    const user = store.users?.[requestId];
    if (!user || user.status !== 'pending') return null;
    store.users[requestId].status = 'approved';
    saveStore(store);
    return {
        userId: requestId,
        segaId: user.lastRequest?.segaId || '',
        reason: user.lastRequest?.reason || '',
        createdAt: user.lastRequest?.createdAt || ''
    };
}

function rejectAccessRequest(requestId) {
    const store = loadStore();
    const user = store.users?.[requestId];
    if (!user || user.status !== 'pending') return null;
    store.users[requestId].status = 'rejected';
    saveStore(store);
    return {
        userId: requestId,
        segaId: user.lastRequest?.segaId || '',
        reason: user.lastRequest?.reason || '',
        createdAt: user.lastRequest?.createdAt || ''
    };
}

module.exports = {
    isUserAllowed,
    registerUser,
    getCredentials,
    addApprovedUser,
    removeApprovedUser,
    getAllowedUsers,
    createAccessRequest,
    getAccessRequest,
    approveAccessRequest,
    rejectAccessRequest
};
