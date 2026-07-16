const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// --- SMTP2GO Transport Config ---
const transporter = nodemailer.createTransport({
    host: 'mail-eu.smtp2go.com',
    port: 8025,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 10000,
});

const FROM_ADDRESS = '"O.S Travel & Tours" <ostravelsandtours@ostravels.com>';

// --- Shared email shell (keeps every template visually consistent) ---
function wrapEmail(bodyHtml) {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">

        <div style="background: #0f172a; padding: 24px; text-align: center;">
            <h1 style="color: #fff; font-size: 20px; margin: 0;">O.S Travel &amp; Tours</h1>
        </div>

        <div style="padding: 28px;">
            ${bodyHtml}
        </div>

        <div style="background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
            &copy; ${new Date().getFullYear()} O.S Travel &amp; Tours. This is an automated message, please do not reply.
        </div>
    </div>`;
}

const contactBlockVisa = `
    <p style="color: #334155; font-size: 14px; margin: 0 0 4px;">For any assistance or to book our services, please contact us:</p>
    <p style="color: #334155; font-size: 14px; margin: 0 0 2px;">📞 Phone: 0333-5542877</p>
    <p style="color: #334155; font-size: 14px; margin: 0 0 2px;">📧 Email: info@ostravel.pk</p>
    <p style="color: #334155; font-size: 14px; margin: 0 0 20px;">🌐 <a href="https://www.ostravel.pk/" style="color: #2563eb;">https://www.ostravel.pk/</a></p>
`;

const contactBlockGeneral = `
    <p style="color: #334155; font-size: 14px; margin: 0 0 4px;">For any assistance, please contact us:</p>
    <p style="color: #334155; font-size: 14px; margin: 0 0 2px;">📞 Phone: 0333-5542877</p>
    <p style="color: #334155; font-size: 14px; margin: 0 0 2px;">📧 Email: ostravelisb@gmail.com</p>
    <p style="color: #334155; font-size: 14px; margin: 0 0 20px;">🌐 <a href="https://www.ostravel.pk/" style="color: #2563eb;">https://www.ostravel.pk/</a></p>
`;

// --- Status Change Email (Visa) ---
router.post('/status-update', async (req, res) => {
    const { to, applicantName, applicationNumber, country, visaType, oldStatus, newStatus } = req.body;

    if (!to || !newStatus) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Updated 7-stage visa pipeline
    const statusColors = {
        'Doc Received':    '#3b82f6',
        'Analyzing':       '#f59e0b',
        'Req Document':    '#fb923c',
        'Visa in Process': '#6366f1',
        'Interview':       '#a855f7',
        'Approve':         '#10b981',
        'Reject':          '#ef4444',
    };
    const color = statusColors[newStatus] || '#334155';
    const isApproved = newStatus === 'Approve';
    const isRejected = newStatus === 'Reject';

    // Per-status "what's happening" line for the in-between stages
    const statusMessages = {
        'Doc Received':    'We have received your documents and they are now in our queue for review.',
        'Analyzing':       'Our team is currently analyzing the documents you submitted.',
        'Req Document':    'We need an additional document from you before we can proceed. Please check your dashboard for details.',
        'Visa in Process': 'Your visa application has moved forward and is now being processed.',
        'Interview':       'Your application has reached the interview stage. Please check your dashboard for scheduling details.',
    };

    const body = `
        <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 12px;">Dear ${applicantName || 'Applicant'},</p>

        ${isApproved
            ? `<p style="color: #1a1a1a; font-size: 15px; margin: 0 0 16px;">
                   Congratulations! We are pleased to inform you that your visa application for
                   <b>${country || ''}</b> has been <b>APPROVED!</b> ✅
               </p>
               <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 16px;">
                   Thank you for choosing OS Travel and Tours for your visa needs.
               </p>`
            : isRejected
            ? `<p style="color: #1a1a1a; font-size: 15px; margin: 0 0 16px;">
                   We regret to inform you that your visa application <b>${applicationNumber || ''}</b> for
                   <b>${country || ''}</b> (${visaType || 'Visa'}) has been <b>rejected</b>. Please log in to your
                   dashboard for further details.
               </p>`
            : `<p style="color: #1a1a1a; font-size: 15px; margin: 0 0 16px;">
                   The status of your visa application <b>${applicationNumber || ''}</b> for
                   <b>${country || ''}</b> (${visaType || 'Visa'}) has been updated.
               </p>
               ${statusMessages[newStatus] ? `<p style="color: #1a1a1a; font-size: 15px; margin: 0 0 16px;">${statusMessages[newStatus]}</p>` : ''}`
        }

        <div style="text-align: center; margin: 20px 0;">
            <span style="display: inline-block; background: ${color}; color: #fff; font-weight: bold; padding: 10px 28px; border-radius: 999px; font-size: 15px; letter-spacing: 0.3px;">
                ${newStatus}
            </span>
        </div>

        <p style="color: #1a1a1a; font-size: 15px; margin: 20px 0 6px;"><b>🌟 What's Next?</b></p>
        <p style="color: #334155; font-size: 14px; margin: 0 0 6px;">
            ${isApproved
                ? 'We offer a wide range of services to make your travel experience seamless:'
                : 'You can log in to your dashboard to view full details. We also offer:'}
        </p>
        <ul style="color: #334155; font-size: 14px; padding-left: 20px; margin: 6px 0 20px; line-height: 1.8;">
            <li>✈️ Flight Ticketing — Book flights to destinations worldwide</li>
            <li>🕋 Umrah Packages — Complete Umrah travel solutions</li>
            <li>🏨 Hotel Bookings — Comfortable accommodations worldwide</li>
            <li>🏥 Travel Insurance — Comprehensive medical coverage</li>
        </ul>

        ${contactBlockVisa}

        <div style="text-align: center; margin-top: 24px;">
            <a href="https://ostravel.pk/dashboard" style="background: #2563eb; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px;">View My Application</a>
        </div>

        <p style="color: #475569; font-size: 14px; margin: 24px 0 0;">
            ${isApproved ? 'Safe travels!<br/>' : ''}
            Best regards,<br/>
            <b>OS Travel and Tours Team</b>
        </p>
    `;

    // Subject line per status
    const subjects = {
        'Approve':         '🎉 Your Visa Has Been Approved!',
        'Reject':          `Your Visa Application Status: Rejected`,
        'Doc Received':    'Your Visa Application Status: Documents Received',
        'Analyzing':       'Your Visa Application Status: Under Analysis',
        'Req Document':    'Action Required: Additional Document Needed',
        'Visa in Process': 'Your Visa Application Status: In Process',
        'Interview':       'Your Visa Application Status: Interview Stage',
    };

    try {
        await transporter.sendMail({
            from: FROM_ADDRESS,
            to,
            subject: subjects[newStatus] || `Your Visa Application Status: ${newStatus}`,
            html: wrapEmail(body),
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

    const body = `
        <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 12px;">Dear ${applicantName || 'Applicant'},</p>

        ${editEnabled
            ? `<p style="color: #1a1a1a; font-size: 15px; margin: 0 0 16px;">
                   Edit access has been <b>enabled</b> for your visa application
                   <b>${applicationNumber || ''}</b> (${country || ''}). Please log in to your dashboard
                   and update the required document(s).
               </p>
               ${reason ? `<div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 16px 0; border-radius: 0 6px 6px 0; color: #1e3a8a; font-size: 14px;">📋 ${reason}</div>` : ''}`
            : `<p style="color: #1a1a1a; font-size: 15px; margin: 0 0 16px;">
                   Edit access has been <b>locked</b> for your visa application
                   <b>${applicationNumber || ''}</b> (${country || ''}). Your submitted documents are now
                   under review. You'll be notified if any further changes are needed.
               </p>`
        }

        ${contactBlockGeneral}

        <div style="text-align: center; margin-top: 24px;">
            <a href="https://ostravel.pk/dashboard" style="background: #2563eb; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px;">Go to My Dashboard</a>
        </div>

        <p style="color: #475569; font-size: 14px; margin: 24px 0 0;">
            Best regards,<br/>
            <b>OS Travel and Tours Team</b>
        </p>
    `;

    try {
        await transporter.sendMail({
            from: FROM_ADDRESS,
            to,
            subject: editEnabled ? 'Action Required: Document Update Needed' : 'Document Review Update',
            html: wrapEmail(body),
        });
        res.json({ success: true });
    } catch (err) {
        console.error('Email send error (edit-access):', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- Umrah Status Change Email ---
router.post('/umrah-status-update', async (req, res) => {
    const { to, applicantName, hotel, checkIn, checkOut, oldStatus, newStatus } = req.body;

    if (!to || !newStatus) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const statusColors = {
        'Pending':       '#f59e0b',
        'Investigating': '#3b82f6',
        'Processing':    '#8b5cf6',
        'Completed':     '#10b981',
        'Cancelled':     '#ef4444',
    };
    const color = statusColors[newStatus] || '#334155';
    const isCompleted = newStatus === 'Completed';

    const body = `
        <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 12px;">Dear ${applicantName || 'Guest'},</p>

        <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 16px;">
            ${isCompleted
                ? 'Great news! Your Umrah package request has been finalized. ✅'
                : `The status of your Umrah package request${hotel ? ` for <b>${hotel}</b>` : ''} has been updated.`}
        </p>

        <div style="text-align: center; margin: 20px 0;">
            <span style="display: inline-block; background: ${color}; color: #fff; font-weight: bold; padding: 10px 28px; border-radius: 999px; font-size: 15px; letter-spacing: 0.3px;">
                ${newStatus}
            </span>
        </div>

        ${(hotel || checkIn || checkOut) ? `
        <div style="background: #f8fafc; border-radius: 10px; padding: 14px 16px; margin: 0 0 20px;">
            ${hotel ? `<p style="color: #334155; font-size: 14px; margin: 0 0 4px;"><b>Hotel:</b> ${hotel}</p>` : ''}
            ${(checkIn || checkOut) ? `<p style="color: #334155; font-size: 14px; margin: 0;"><b>Dates:</b> ${checkIn || '—'} → ${checkOut || '—'}</p>` : ''}
        </div>` : ''}

        ${contactBlockGeneral}

        <div style="text-align: center; margin-top: 24px;">
            <a href="https://ostravel.pk/dashboard" style="background: #2563eb; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px;">View My Request</a>
        </div>

        <p style="color: #475569; font-size: 14px; margin: 24px 0 0;">
            Best regards,<br/>
            <b>OS Travel and Tours Team</b>
        </p>
    `;

    try {
        await transporter.sendMail({
            from: FROM_ADDRESS,
            to,
            subject: isCompleted ? '🕋 Your Umrah Package Is Confirmed!' : `Your Umrah Request Status: ${newStatus}`,
            html: wrapEmail(body),
        });
        res.json({ success: true });
    } catch (err) {
        console.error('Email send error (umrah-status-update):', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- Admin Message Email (Visa applications) ---
router.post('/application-message', async (req, res) => {
    const { to, applicantName, applicationNumber, country, message } = req.body;

    if (!to || !message) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const body = `
        <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 12px;">Dear ${applicantName || 'Applicant'},</p>

        <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 16px;">
            You have a new message from our team regarding your visa application
            ${applicationNumber ? `<b>${applicationNumber}</b>` : ''}${country ? ` (${country})` : ''}:
        </p>

        <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 16px; margin: 0 0 20px; border-radius: 0 6px 6px 0; color: #92400e; font-size: 14px; white-space: pre-wrap;">📋 ${message}</div>

        ${contactBlockGeneral}

        <div style="text-align: center; margin-top: 24px;">
            <a href="https://ostravel.pk/dashboard" style="background: #2563eb; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px;">Go to My Dashboard</a>
        </div>

        <p style="color: #475569; font-size: 14px; margin: 24px 0 0;">
            Best regards,<br/>
            <b>OS Travel and Tours Team</b>
        </p>
    `;

    try {
        await transporter.sendMail({
            from: FROM_ADDRESS,
            to,
            subject: 'Action Required: New Message About Your Visa Application',
            html: wrapEmail(body),
        });
        res.json({ success: true });
    } catch (err) {
        console.error('Email send error (application-message):', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- Umrah Admin Message Email ---
router.post('/umrah-message', async (req, res) => {
    const { to, applicantName, hotel, message } = req.body;

    if (!to || !message) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const body = `
        <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 12px;">Dear ${applicantName || 'Guest'},</p>

        <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 16px;">
            You have a new message from our team regarding your Umrah package request${hotel ? ` (<b>${hotel}</b>)` : ''}:
        </p>

        <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 14px 16px; margin: 0 0 20px; border-radius: 0 6px 6px 0; color: #1e3a8a; font-size: 14px; white-space: pre-wrap;">💬 ${message}</div>

        ${contactBlockGeneral}

        <div style="text-align: center; margin-top: 24px;">
            <a href="https://ostravel.pk/dashboard" style="background: #2563eb; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px;">View My Request</a>
        </div>

        <p style="color: #475569; font-size: 14px; margin: 24px 0 0;">
            Best regards,<br/>
            <b>OS Travel and Tours Team</b>
        </p>
    `;

    try {
        await transporter.sendMail({
            from: FROM_ADDRESS,
            to,
            subject: 'New Message About Your Umrah Request',
            html: wrapEmail(body),
        });
        res.json({ success: true });
    } catch (err) {
        console.error('Email send error (umrah-message):', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- Document Verified Email ---
router.post('/verify-document', async (req, res) => {
    const { to, applicantName, applicationNumber, country, docLabel, allVerified } = req.body;

    if (!to || !docLabel) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const body = `
        <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 12px;">Dear ${applicantName || 'Applicant'},</p>

        <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 16px;">
            Great news! Your <b>${docLabel}</b> has been successfully verified ✅ for your visa
            application ${applicationNumber ? `<b>${applicationNumber}</b>` : ''}${country ? ` (${country})` : ''}.
        </p>

        ${allVerified
            ? `<div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 14px 16px; margin: 0 0 20px; border-radius: 0 6px 6px 0; color: #065f46; font-size: 14px;">
                   🎉 All your documents have been verified! Our team will now proceed with processing your visa application.
               </div>`
            : `<div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 16px; margin: 0 0 20px; border-radius: 0 6px 6px 0; color: #1e3a8a; font-size: 14px;">
                   Our team is still reviewing your remaining documents. You'll be notified as each one is verified.
               </div>`
        }

        ${contactBlockVisa}

        <div style="text-align: center; margin-top: 24px;">
            <a href="https://ostravel.pk/dashboard" style="background: #2563eb; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px;">View My Application</a>
        </div>

        <p style="color: #475569; font-size: 14px; margin: 24px 0 0;">
            Best regards,<br/>
            <b>OS Travel and Tours Team</b>
        </p>
    `;

    try {
        await transporter.sendMail({
            from: FROM_ADDRESS,
            to,
            subject: allVerified
                ? '✅ All Documents Verified — Your Application Is Being Processed'
                : `✅ Document Verified: ${docLabel}`,
            html: wrapEmail(body),
        });
        res.json({ success: true });
    } catch (err) {
        console.error('Email send error (verify-document):', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── ADD THIS ROUTE INTO YOUR EXISTING routes.js (the file you pasted) ───────
// Paste it right before `module.exports = router;` at the bottom.
// Reuses your existing transporter, wrapEmail(), FROM_ADDRESS, and
// contactBlockVisa — no new setup needed.

// --- Consolidated Update Email (status + edit-access + message + documents, ONE email) ---
router.post('/consolidated-update', async (req, res) => {
    const {
        to, applicantName, applicationNumber, country, visaType,
        statusChange,     // { oldStatus, newStatus } | null
        editAccess,       // { enabled, reason } | null
        message,          // string | null
        documentActions,  // [{ docLabel, action: 'verified' | 'reupload_requested' | 'deleted', message? }]
    } = req.body;

    if (!to) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const statusColors = {
        'Doc Received':    '#3b82f6',
        'Analyzing':       '#f59e0b',
        'Req Document':    '#fb923c',
        'Visa in Process': '#6366f1',
        'Interview':       '#a855f7',
        'Approve':         '#10b981',
        'Reject':          '#ef4444',
    };

    const sections = [];

    // --- Status change block ---
    if (statusChange && statusChange.newStatus) {
        const color = statusColors[statusChange.newStatus] || '#334155';
        sections.push(`
            <div style="margin: 0 0 22px;">
                <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 10px;"><b>📌 Application Status Updated</b></p>
                <div style="text-align: center; margin: 12px 0;">
                    <span style="display: inline-block; background: ${color}; color: #fff; font-weight: bold; padding: 8px 22px; border-radius: 999px; font-size: 14px; letter-spacing: 0.3px;">
                        ${statusChange.newStatus}
                    </span>
                </div>
            </div>
        `);
    }

    // --- Edit access block ---
    if (editAccess) {
        sections.push(`
            <div style="margin: 0 0 22px;">
                <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 8px;">
                    <b>${editAccess.enabled ? '🔓 Edit Access Enabled' : '🔒 Edit Access Locked'}</b>
                </p>
                <p style="color: #334155; font-size: 14px; margin: 0 0 8px;">
                    ${editAccess.enabled
                        ? 'Please log in to your dashboard and update the required document(s).'
                        : 'Your submitted documents are now under review.'}
                </p>
                ${editAccess.reason ? `<div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 10px 14px; border-radius: 0 6px 6px 0; color: #1e3a8a; font-size: 14px;">📋 ${editAccess.reason}</div>` : ''}
            </div>
        `);
    }

    // --- Admin message block ---
    if (message) {
        sections.push(`
            <div style="margin: 0 0 22px;">
                <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 8px;"><b>💬 Message from Our Team</b></p>
                <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 10px 14px; border-radius: 0 6px 6px 0; color: #92400e; font-size: 14px; white-space: pre-wrap;">${message}</div>
            </div>
        `);
    }

    // --- Document actions block ---
    if (Array.isArray(documentActions) && documentActions.length > 0) {
        const rows = documentActions.map(a => {
            const tag = a.action === 'verified'
                ? '<span style="color:#10b981;">✅ Verified</span>'
                : a.action === 'reupload_requested'
                ? '<span style="color:#f59e0b;">⚠️ Re-upload requested</span>'
                : a.action === 'deleted'
                ? '<span style="color:#ef4444;">🗑️ Removed</span>'
                : a.action;
            return `<li style="margin-bottom: 8px; color: #334155; font-size: 14px;">
                        <b>${a.docLabel}</b> — ${tag}
                        ${a.message ? `<br/><span style="font-size: 13px; color: #64748b;">${a.message}</span>` : ''}
                    </li>`;
        }).join('');
        sections.push(`
            <div style="margin: 0 0 22px;">
                <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 8px;"><b>📄 Document Updates</b></p>
                <ul style="margin: 0; padding-left: 18px;">${rows}</ul>
            </div>
        `);
    }

    if (sections.length === 0) {
        return res.status(400).json({ success: false, message: 'Nothing to send' });
    }

    const body = `
        <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 16px;">Dear ${applicantName || 'Applicant'},</p>

        <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 20px;">
            Here is a summary of the latest updates on your visa application
            ${applicationNumber ? `<b>${applicationNumber}</b>` : ''}${country ? ` (${country}${visaType ? ', ' + visaType : ''})` : ''}:
        </p>

        ${sections.join('')}

        ${contactBlockVisa}

        <div style="text-align: center; margin-top: 24px;">
            <a href="https://ostravel.pk/dashboard" style="background: #2563eb; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px;">View My Application</a>
        </div>

        <p style="color: #475569; font-size: 14px; margin: 24px 0 0;">
            Best regards,<br/>
            <b>OS Travel and Tours Team</b>
        </p>
    `;

    try {
        await transporter.sendMail({
            from: FROM_ADDRESS,
            to,
            subject: `Update on Your Visa Application${applicationNumber ? ' — ' + applicationNumber : ''}`,
            html: wrapEmail(body),
        });
        res.json({ success: true });
    } catch (err) {
        console.error('Email send error (consolidated-update):', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;