const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// --- SMTP2GO Transport Config ---
// Set SMTP_USER / SMTP_PASS in Railway's Variables tab for this project.
// Get them from your SMTP2GO dashboard: Sender -> SMTP Users
const transporter = nodemailer.createTransport({
    host: 'mail-eu.smtp2go.com',
    port: 8025, // switched from 587 — Railway's network was timing out on 2525
    secure: false, // 587 uses STARTTLS, not implicit SSL
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 10000, // fail fast (10s) instead of hanging
});

const FROM_ADDRESS = '"O.S Travel & Tours" <noreply@ostravels.com>'; // must be a verified sender in SMTP2GO

// --- Status Change Email ---
router.post('/status-update', async (req, res) => {
    const { to, applicantName, applicationNumber, country, visaType, oldStatus, newStatus } = req.body;

    if (!to || !newStatus) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const statusColors = {
        'Doc Received': '#3b82f6',
        'Analyzing': '#f59e0b',
        'Approved': '#10b981',
        'Rejected': '#ef4444',
    };
    const color = statusColors[newStatus] || '#334155';

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: #0f172a; padding: 24px; text-align: center;">
            <h1 style="color: #fff; font-size: 20px; margin: 0;">O.S Travel & Tours</h1>
        </div>
        <div style="padding: 28px;">
            <p style="color: #334155; font-size: 15px;">Dear ${applicantName || 'Applicant'},</p>
            <p style="color: #334155; font-size: 15px;">
                The status of your visa application <b>${applicationNumber || ''}</b> for
                <b>${country || ''}</b> (${visaType || 'Visa'}) has been updated.
            </p>
            <div style="text-align:center; margin: 24px 0;">
                <span style="display:inline-block; background:${color}; color:#fff; font-weight:bold; padding:10px 22px; border-radius:999px; font-size:14px;">
                    ${newStatus}
                </span>
            </div>
            <p style="color: #64748b; font-size: 13px;">
                You can log in to your dashboard anytime to view full details of your application.
            </p>
            <div style="text-align:center; margin-top:24px;">
                <a href="https://ostravels.com/dashboard" style="background:#2563eb; color:#fff; text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:bold; font-size:14px;">View My Application</a>
            </div>
        </div>
        <div style="background:#f8fafc; padding:16px; text-align:center; font-size:11px; color:#94a3b8;">
            &copy; ${new Date().getFullYear()} O.S Travel & Tours. This is an automated message, please do not reply.
        </div>
    </div>`;

    try {
        await transporter.sendMail({
            from: FROM_ADDRESS,
            to,
            subject: `Your Visa Application Status: ${newStatus}`,
            html,
        });
        res.json({ success: true });
    } catch (err) {
        console.error('Email send error (status-update):', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- Edit Access Email (enabled / locked) ---
router.post('/edit-access', async (req, res) => {
    const { to, applicantName, applicationNumber, country, editEnabled, reason } = req.body;

    if (!to) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: #0f172a; padding: 24px; text-align: center;">
            <h1 style="color: #fff; font-size: 20px; margin: 0;">O.S Travel & Tours</h1>
        </div>
        <div style="padding: 28px;">
            <p style="color: #334155; font-size: 15px;">Dear ${applicantName || 'Applicant'},</p>
            ${editEnabled
            ? `<p style="color: #334155; font-size: 15px;">
                    Edit access has been <b>enabled</b> for your visa application
                    <b>${applicationNumber || ''}</b> (${country || ''}). Please log in to your dashboard
                    and update the required document(s).
                   </p>
                   ${reason ? `<div style="background:#eff6ff; border-left:4px solid #2563eb; padding:12px 16px; margin:16px 0; border-radius:6px; color:#1e3a8a; font-size:14px;">${reason}</div>` : ''}
                  `
            : `<p style="color: #334155; font-size: 15px;">
                    Edit access has been <b>locked</b> for your visa application
                    <b>${applicationNumber || ''}</b> (${country || ''}). Your submitted documents are now
                    under review. You'll be notified if any further changes are needed.
                   </p>`
        }
            <div style="text-align:center; margin-top:24px;">
                <a href="https://ostravels.com/dashboard" style="background:#2563eb; color:#fff; text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:bold; font-size:14px;">Go to My Dashboard</a>
            </div>
        </div>
        <div style="background:#f8fafc; padding:16px; text-align:center; font-size:11px; color:#94a3b8;">
            &copy; ${new Date().getFullYear()} O.S Travel & Tours. This is an automated message, please do not reply.
        </div>
    </div>`;

    try {
        await transporter.sendMail({
            from: FROM_ADDRESS,
            to,
            subject: editEnabled ? 'Action Required: Document Update Needed' : 'Document Review Update',
            html,
        });
        res.json({ success: true });
    } catch (err) {
        console.error('Email send error (edit-access):', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;