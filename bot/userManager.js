const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const USER_DATA_FILE = path.join(__dirname, 'userData.json');
const APPROVALS_FILE = path.join(__dirname, 'approvals.json');
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

function loadData() {
    if (!fs.existsSync(USER_DATA_FILE)) {
        return {};
    }
    try {
        return JSON.parse(fs.readFileSync(USER_DATA_FILE, 'utf8'));
    } catch (e) {
        console.error("Failed to load user data:", e);
        return {};
    }
}

function loadApprovals() {
    if (!fs.existsSync(APPROVALS_FILE)) {
        return { approvedUsers: [] };
    }
    try {
        return JSON.parse(fs.readFileSync(APPROVALS_FILE, 'utf8'));
    } catch (e) {
        console.error("Failed to load approvals:", e);
        return { approvedUsers: [] };
    }
}

function saveApprovals(data) {
    fs.writeFileSync(APPROVALS_FILE, JSON.stringify(data, null, 2));
}

function saveData(data) {
    fs.writeFileSync(USER_DATA_FILE, JSON.stringify(data, null, 2));
}

function isUserAllowed(userId) {
    if (ALLOWED_USERS.includes(userId)) return true;
    const approvals = loadApprovals();
    return approvals.approvedUsers.includes(userId);
}

function addApprovedUser(userId) {
    const approvals = loadApprovals();
    if (!approvals.approvedUsers.includes(userId)) {
        approvals.approvedUsers.push(userId);
        saveApprovals(approvals);
    }
}

function removeApprovedUser(userId) {
    const approvals = loadApprovals();
    const next = approvals.approvedUsers.filter(id => id !== userId);
    const removed = next.length !== approvals.approvedUsers.length;
    if (removed) {
        approvals.approvedUsers = next;
        saveApprovals(approvals);
    }
    return removed;
}

function getAllowedUsers() {
    const approvals = loadApprovals();
    return {
        envUsers: ALLOWED_USERS.filter(Boolean),
        approvedUsers: approvals.approvedUsers
    };
}

function registerUser(userId, segaId, password) {
    if (!isUserAllowed(userId)) {
        throw new Error("User not authorized to use this bot.");
    }
    const data = loadData();
    data[userId] = {
        segaId: encrypt(segaId),
        password: encrypt(password)
    };
    saveData(data);
}

function getCredentials(userId) {
    if (!isUserAllowed(userId)) {
        throw new Error("User not authorized.");
    }
    const data = loadData();
    const user = data[userId];
    if (!user) return null;

    return {
        segaId: decrypt(user.segaId),
        password: decrypt(user.password)
    };
}

module.exports = {
    isUserAllowed,
    registerUser,
    getCredentials,
    addApprovedUser,
    removeApprovedUser,
    getAllowedUsers
};
