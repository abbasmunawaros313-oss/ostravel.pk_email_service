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

// --- Status Change Email ---
router.post('/status-update', async (req, res) => {
    const { to, applicantName, applicationNumber, country, visaType, oldStatus, newStatus } = req.body;

    if (!to || !newStatus) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const statusColors = {
        'Doc Received': '#3b82f6',
        'Analyzing':    '#f59e0b',
        'Approved':     '#10b981',
        'Rejected':     '#ef4444',
    };
    const color = statusColors[newStatus] || '#334155';
    const isApproved = newStatus === 'Approved';

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">

        <div style="background: #0f172a; padding: 24px; text-align: center;">
            <h1 style="color: #fff; font-size: 20px; margin: 0;">O.S Travel &amp; Tours</h1>
        </div>

        <div style="padding: 28px;">
            <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 12px;">Dear ${applicantName || 'Applicant'},</p>

            ${isApproved
                ? `<p style="color: #1a1a1a; font-size: 15px; margin: 0 0 16px;">
                       Congratulations! We are pleased to inform you that your visa application for
                       <b>${country || ''}</b> has been <b>APPROVED!</b> ✅
                   </p>
                   <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 16px;">
                       Thank you for choosing OS Travel and Tours for your visa needs.
                   </p>`
                : `<p style="color: #1a1a1a; font-size: 15px; margin: 0 0 16px;">
                       The status of your visa application <b>${applicationNumber || ''}</b> for
                       <b>${country || ''}</b> (${visaType || 'Visa'}) has been updated.
                   </p>`
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

            <p style="color: #334155; font-size: 14px; margin: 0 0 4px;">For any assistance or to book our services, please contact us:</p>
            <p style="color: #334155; font-size: 14px; margin: 0 0 2px;">📞 Phone: 0333-5542877</p>
            <p style="color: #334155; font-size: 14px; margin: 0 0 2px;">📧 Email: info@ostravel.pk</p>
            <p style="color: #334155; font-size: 14px; margin: 0 0 20px;">🌐 <a href="https://www.ostravel.pk/" style="color: #2563eb;">https://www.ostravel.pk/</a></p>

            <div style="text-align: center; margin-top: 24px;">
                <a href="https://ostravel.pk/dashboard" style="background: #2563eb; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px;">View My Application</a>
            </div>

            <p style="color: #475569; font-size: 14px; margin: 24px 0 0;">
                ${isApproved ? 'Safe travels!<br/>' : ''}
                Best regards,<br/>
                <b>OS Travel and Tours Team</b>
            </p>
        </div>

        <div style="background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
            &copy; ${new Date().getFullYear()} O.S Travel &amp; Tours. This is an automated message, please do not reply.
        </div>
    </div>`;

    try {
        await transporter.sendMail({
            from: FROM_ADDRESS,
            to,
            subject: isApproved ? '🎉 Your Visa Has Been Approved!' : `Your Visa Application Status: ${newStatus}`,
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
            <h1 style="color: #fff; font-size: 20px; margin: 0;">O.S Travel &amp; Tours</h1>
        </div>

        <div style="padding: 28px;">
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

            <p style="color: #334155; font-size: 14px; margin: 0 0 4px;">For any assistance, please contact us:</p>
            <p style="color: #334155; font-size: 14px; margin: 0 0 2px;">📞 Phone: 0333-5542877</p>
            <p style="color: #334155; font-size: 14px; margin: 0 0 2px;">📧 Email: ostravelisb@gmail.com</p>
            <p style="color: #334155; font-size: 14px; margin: 0 0 20px;">🌐 <a href="https://www.ostravel.pk/" style="color: #2563eb;">https://www.ostravel.pk/</a></p>

            <div style="text-align: center; margin-top: 24px;">
                <a href="https://ostravel.pk/dashboard" style="background: #2563eb; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px;">Go to My Dashboard</a>
            </div>

            <p style="color: #475569; font-size: 14px; margin: 24px 0 0;">
                Best regards,<br/>
                <b>OS Travel and Tours Team</b>
            </p>
        </div>

        <div style="background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
            &copy; ${new Date().getFullYear()} O.S Travel &amp; Tours. This is an automated message, please do not reply.
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