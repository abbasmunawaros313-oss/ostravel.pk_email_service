const express = require('express');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
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

// --- Fetch a remote file and return it as a Buffer for nodemailer attachment ---
async function fetchAttachment(url, filename) {
    if (!url) return null;
    try {
        const fetch = (await import('node-fetch')).default;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = await res.buffer();
        const contentType = res.headers.get('content-type') || 'application/octet-stream';
        return { filename: filename || 'document', content: buffer, contentType };
    } catch (err) {
        console.error('Failed to fetch attachment:', err.message);
        return null;
    }
}

// --- Shared email shell ---
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

// =====================================================================
// --- Invoice PDF Generator ---
// Builds a clean, professional one-page invoice PDF as a Buffer.
// =====================================================================
function generateInvoicePDF(data) {
    const {
        invoiceNumber, applicantName, email, phone,
        recordType, country, visaType, planName,
        amountPaid, visaFee, urgentFee, urgentProcessing,
        transactionId, transactionRef, paymentMethod, paidAt,
    } = data;

    const fmt = (n) => Number(n || 0).toLocaleString('en-PK');
    const paidDate = paidAt ? new Date(paidAt) : new Date();
    const paidDateStr = isNaN(paidDate.getTime())
        ? new Date().toLocaleDateString('en-PK', { dateStyle: 'long' })
        : paidDate.toLocaleDateString('en-PK', { dateStyle: 'long' });

    const isVisa = recordType === 'visa';
    const serviceType = isVisa ? 'Visa Application' : 'Travel Insurance';

    const breakdown = isVisa
        ? [
            { label: 'Visa Fee', amount: visaFee || (amountPaid - (urgentFee || 0)) },
            ...(urgentProcessing ? [{ label: 'Urgent Processing Fee', amount: urgentFee || 0 }] : []),
        ]
        : [
            { label: planName ? `Insurance Premium - ${planName}` : 'Insurance Premium', amount: amountPaid },
        ];

    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const chunks = [];
            doc.on('data', (c) => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // --- Header band ---
            doc.rect(0, 0, doc.page.width, 90).fill('#0f172a');
            doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold')
                .text('O.S Travel & Tours', 50, 30);
            doc.fontSize(9).font('Helvetica').fillColor('#94a3b8')
                .text('www.ostravel.pk', 50, 55);

            doc.fontSize(9).fillColor('#94a3b8').text('INVOICE', 0, 28, { align: 'right', width: doc.page.width - 50 });
            doc.fontSize(13).font('Helvetica-Bold').fillColor('#ffffff')
                .text(`#${invoiceNumber || '-'}`, 0, 42, { align: 'right', width: doc.page.width - 50 });
            doc.fontSize(9).font('Helvetica').fillColor('#94a3b8')
                .text(paidDateStr, 0, 60, { align: 'right', width: doc.page.width - 50 });

            doc.fillColor('#000000');
            let y = 120;

            // --- Billed To / Service Details ---
            doc.font('Helvetica-Bold').fontSize(10).fillColor('#64748b').text('BILLED TO', 50, y);
            doc.font('Helvetica-Bold').fontSize(10).fillColor('#64748b').text('SERVICE DETAILS', 320, y);
            y += 16;
            doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text(applicantName || '-', 50, y);
            doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text(serviceType, 320, y);
            y += 16;
            doc.font('Helvetica').fontSize(10).fillColor('#334155').text(email || '-', 50, y);
            if (isVisa) {
                doc.font('Helvetica').fontSize(10).fillColor('#334155').text(`Country: ${country || '-'}`, 320, y);
            } else if (planName) {
                doc.font('Helvetica').fontSize(10).fillColor('#334155').text(`Plan: ${planName}`, 320, y);
            }
            y += 14;
            doc.font('Helvetica').fontSize(10).fillColor('#334155').text(phone || '-', 50, y);
            if (isVisa && visaType) {
                doc.font('Helvetica').fontSize(10).fillColor('#334155').text(`Type: ${visaType}`, 320, y);
            }
            y += 34;

            // --- Fee table header ---
            doc.rect(50, y, doc.page.width - 100, 26).fill('#f1f5f9');
            doc.fillColor('#334155').font('Helvetica-Bold').fontSize(9)
                .text('DESCRIPTION', 62, y + 8)
                .text('AMOUNT (PKR)', 0, y + 8, { align: 'right', width: doc.page.width - 62 });
            y += 26;

            breakdown.forEach((row) => {
                doc.fillColor('#334155').font('Helvetica').fontSize(10)
                    .text(row.label, 62, y + 8)
                    .text(fmt(row.amount), 0, y + 8, { align: 'right', width: doc.page.width - 62 });
                doc.moveTo(50, y + 30).lineTo(doc.page.width - 50, y + 30).strokeColor('#e2e8f0').stroke();
                y += 30;
            });

            // --- Total row ---
            doc.rect(50, y, doc.page.width - 100, 32).fill('#0f172a');
            doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11)
                .text('TOTAL PAID', 62, y + 9)
                .fillColor('#34d399')
                .text(`PKR ${fmt(amountPaid)}`, 0, y + 9, { align: 'right', width: doc.page.width - 62 });
            y += 55;

            // --- Payment confirmation box ---
            doc.rect(50, y, doc.page.width - 100, 78).fill('#f0fdf4').strokeColor('#bbf7d0').lineWidth(1).stroke();
            doc.fillColor('#065f46').font('Helvetica-Bold').fontSize(11).text(`Payment PAID`, 62, y + 10);
            doc.font('Helvetica').fontSize(9).fillColor('#065f46');
            doc.text(`Transaction ID: ${transactionId || '-'}`, 62, y + 30);
            doc.text(`Reference: ${transactionRef || '-'}`, 62, y + 45);
            doc.text(`Method: ${paymentMethod || 'Bank Alfalah'}`, 62, y + 60);
            y += 100;

            // --- Footer ---
            doc.font('Helvetica').fontSize(8).fillColor('#94a3b8')
                .text('This is an automated invoice from O.S Travel & Tours - www.ostravel.pk', 50, y, {
                    align: 'center', width: doc.page.width - 100,
                });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

// --- Invoice Email (PDF attached) ---
router.post('/invoice', async (req, res) => {
    const {
        to, recordType, invoiceNumber, applicantName, email, phone,
        country, visaType, planName, amountPaid, visaFee, urgentFee,
        urgentProcessing, transactionId, transactionRef, paymentMethod, paidAt,
    } = req.body;

    if (!to || !amountPaid) return res.status(400).json({ success: false, message: 'Missing required fields' });

    const isVisa = recordType === 'visa';
    const serviceLine = isVisa
        ? `visa application ${invoiceNumber ? `<b>${invoiceNumber}</b>` : ''}${country ? ` for <b>${country}</b>` : ''}`
        : `travel insurance policy ${invoiceNumber ? `<b>${invoiceNumber}</b>` : ''}`;

    const body = `
        <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 12px;">Dear ${applicantName || 'Customer'},</p>
        <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 16px;">Thank you for your payment! Your ${serviceLine} has been confirmed. ✅</p>
        <div style="background: #f0fdf4; border-left: 4px solid #10b981; border-radius: 0 8px 8px 0; padding: 14px 16px; margin: 0 0 20px;">
            <p style="color: #065f46; font-size: 14px; margin: 0; font-weight: bold;">📎 Your invoice is attached to this email as a PDF.</p>
            <p style="color: #64748b; font-size: 13px; margin: 4px 0 0;">You can also view it anytime from your dashboard.</p>
        </div>
        <div style="background: #f8fafc; border-radius: 10px; padding: 14px 16px; margin: 0 0 20px;">
            <p style="color: #334155; font-size: 14px; margin: 0 0 4px;"><b>Amount Paid:</b> PKR ${Number(amountPaid || 0).toLocaleString('en-PK')}</p>
            <p style="color: #334155; font-size: 14px; margin: 0;"><b>Transaction ID:</b> ${transactionId || '-'}</p>
        </div>
        ${contactBlockVisa}
        <div style="text-align: center; margin-top: 24px;">
            <a href="https://ostravel.pk/dashboard" style="background: #2563eb; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px;">View My Dashboard</a>
        </div>
        <p style="color: #475569; font-size: 14px; margin: 24px 0 0;">Best regards,<br/><b>OS Travel and Tours Team</b></p>
    `;

    try {
        const pdfBuffer = await generateInvoicePDF({
            invoiceNumber, applicantName, email, phone, recordType, country, visaType,
            planName, amountPaid, visaFee, urgentFee, urgentProcessing,
            transactionId, transactionRef, paymentMethod, paidAt,
        });

        await transporter.sendMail({
            from: FROM_ADDRESS,
            to,
            subject: `Your Invoice — ${invoiceNumber || (isVisa ? 'Visa Application' : 'Insurance Policy')}`,
            html: wrapEmail(body),
            attachments: [{
                filename: `Invoice-${invoiceNumber || 'OSTravels'}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf',
            }],
        });
        res.json({ success: true });
    } catch (err) {
        console.error('Email send error (invoice):', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- Status Change Email (Visa) ---
router.post('/status-update', async (req, res) => {
    const { to, applicantName, applicationNumber, country, visaType, oldStatus, newStatus, decisionDocURL, decisionDocName } = req.body;
    if (!to || !newStatus) return res.status(400).json({ success: false, message: 'Missing required fields' });

    const statusColors = {
        'Doc Received': '#3b82f6', 'Analyzing': '#f59e0b', 'Req Document': '#fb923c',
        'Visa in Process': '#6366f1', 'Interview': '#a855f7', 'Approve': '#10b981', 'Reject': '#ef4444',
    };
    const color = statusColors[newStatus] || '#334155';
    const isApproved = newStatus === 'Approve';
    const isRejected = newStatus === 'Reject';

    const statusMessages = {
        'Doc Received': 'We have received your documents and they are now in our queue for review.',
        'Analyzing': 'Our team is currently analyzing the documents you submitted.',
        'Req Document': 'We need an additional document from you before we can proceed. Please check your dashboard for details.',
        'Visa in Process': 'Your visa application has moved forward and is now being processed.',
        'Interview': 'Your application has reached the interview stage. Please check your dashboard for scheduling details.',
    };

    const decisionNoteHtml = (isApproved || isRejected) && decisionDocURL ? `
        <div style="background: ${isApproved ? '#f0fdf4' : '#fef2f2'}; border-left: 4px solid ${isApproved ? '#10b981' : '#ef4444'}; border-radius: 0 8px 8px 0; padding: 14px 16px; margin: 16px 0;">
            <p style="color: ${isApproved ? '#065f46' : '#991b1b'}; font-size: 14px; margin: 0 0 6px; font-weight: bold;">
                ${isApproved ? '📎 Your approved visa letter is attached to this email.' : '📎 Your rejection letter is attached to this email.'}
            </p>
            <p style="color: #64748b; font-size: 13px; margin: 0;">You can also view it anytime from your dashboard.</p>
        </div>` : '';

    const body = `
        <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 12px;">Dear ${applicantName || 'Applicant'},</p>
        ${isApproved
            ? `<p style="color: #1a1a1a; font-size: 15px; margin: 0 0 16px;">Congratulations! We are pleased to inform you that your visa application for <b>${country || ''}</b> has been <b>APPROVED!</b> ✅</p><p style="color: #1a1a1a; font-size: 15px; margin: 0 0 16px;">Thank you for choosing OS Travel and Tours for your visa needs.</p>`
            : isRejected
            ? `<p style="color: #1a1a1a; font-size: 15px; margin: 0 0 16px;">We regret to inform you that your visa application <b>${applicationNumber || ''}</b> for <b>${country || ''}</b> (${visaType || 'Visa'}) has been <b>rejected</b>. Please log in to your dashboard for further details.</p>`
            : `<p style="color: #1a1a1a; font-size: 15px; margin: 0 0 16px;">The status of your visa application <b>${applicationNumber || ''}</b> for <b>${country || ''}</b> (${visaType || 'Visa'}) has been updated.</p>${statusMessages[newStatus] ? `<p style="color: #1a1a1a; font-size: 15px; margin: 0 0 16px;">${statusMessages[newStatus]}</p>` : ''}`
        }
        <div style="text-align: center; margin: 20px 0;">
            <span style="display: inline-block; background: ${color}; color: #fff; font-weight: bold; padding: 10px 28px; border-radius: 999px; font-size: 15px; letter-spacing: 0.3px;">${newStatus}</span>
        </div>
        ${decisionNoteHtml}
        <p style="color: #1a1a1a; font-size: 15px; margin: 20px 0 6px;"><b>🌟 What's Next?</b></p>
        <p style="color: #334155; font-size: 14px; margin: 0 0 6px;">${isApproved ? 'We offer a wide range of services to make your travel experience seamless:' : 'You can log in to your dashboard to view full details. We also offer:'}</p>
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
        <p style="color: #475569; font-size: 14px; margin: 24px 0 0;">${isApproved ? 'Safe travels!<br/>' : ''}Best regards,<br/><b>OS Travel and Tours Team</b></p>
    `;

    const subjects = {
        'Approve': '🎉 Your Visa Has Been Approved!', 'Reject': `Your Visa Application Status: Rejected`,
        'Doc Received': 'Your Visa Application Status: Documents Received', 'Analyzing': 'Your Visa Application Status: Under Analysis',
        'Req Document': 'Action Required: Additional Document Needed', 'Visa in Process': 'Your Visa Application Status: In Process',
        'Interview': 'Your Visa Application Status: Interview Stage',
    };

    try {
        const mailOptions = {
            from: FROM_ADDRESS,
            to,
            subject: subjects[newStatus] || `Your Visa Application Status: ${newStatus}`,
            html: wrapEmail(body),
        };

        // Attach decision document if provided
        if ((isApproved || isRejected) && decisionDocURL) {
            const attachment = await fetchAttachment(decisionDocURL, decisionDocName || (isApproved ? 'approved_visa.pdf' : 'rejection_letter.pdf'));
            if (attachment) {
                mailOptions.attachments = [{
                    filename: attachment.filename,
                    content: attachment.content,
                    contentType: attachment.contentType,
                }];
            }
        }

        await transporter.sendMail(mailOptions);
        res.json({ success: true });
    } catch (err) {
        console.error('Email send error (status-update):', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- Edit Access Email ---
router.post('/edit-access', async (req, res) => {
    const { to, applicantName, applicationNumber, country, editEnabled, reason } = req.body;
    if (!to) return res.status(400).json({ success: false, message: 'Missing required fields' });

    const body = `
        <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 12px;">Dear ${applicantName || 'Applicant'},</p>
        ${editEnabled
            ? `<p style="color: #1a1a1a; font-size: 15px; margin: 0 0 16px;">Edit access has been <b>enabled</b> for your visa application <b>${applicationNumber || ''}</b> (${country || ''}). Please log in to your dashboard and update the required document(s).</p>${reason ? `<div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 16px 0; border-radius: 0 6px 6px 0; color: #1e3a8a; font-size: 14px;">📋 ${reason}</div>` : ''}`
            : `<p style="color: #1a1a1a; font-size: 15px; margin: 0 0 16px;">Edit access has been <b>locked</b> for your visa application <b>${applicationNumber || ''}</b> (${country || ''}). Your submitted documents are now under review. You'll be notified if any further changes are needed.</p>`
        }
        ${contactBlockGeneral}
        <div style="text-align: center; margin-top: 24px;">
            <a href="https://ostravel.pk/dashboard" style="background: #2563eb; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px;">Go to My Dashboard</a>
        </div>
        <p style="color: #475569; font-size: 14px; margin: 24px 0 0;">Best regards,<br/><b>OS Travel and Tours Team</b></p>
    `;

    try {
        await transporter.sendMail({ from: FROM_ADDRESS, to, subject: editEnabled ? 'Action Required: Document Update Needed' : 'Document Review Update', html: wrapEmail(body) });
        res.json({ success: true });
    } catch (err) {
        console.error('Email send error (edit-access):', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- Umrah Status Change Email ---
router.post('/umrah-status-update', async (req, res) => {
    const { to, applicantName, hotel, checkIn, checkOut, oldStatus, newStatus } = req.body;
    if (!to || !newStatus) return res.status(400).json({ success: false, message: 'Missing required fields' });

    const statusColors = { 'Pending': '#f59e0b', 'Investigating': '#3b82f6', 'Processing': '#8b5cf6', 'Completed': '#10b981', 'Cancelled': '#ef4444' };
    const color = statusColors[newStatus] || '#334155';
    const isCompleted = newStatus === 'Completed';

    const body = `
        <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 12px;">Dear ${applicantName || 'Guest'},</p>
        <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 16px;">${isCompleted ? 'Great news! Your Umrah package request has been finalized. ✅' : `The status of your Umrah package request${hotel ? ` for <b>${hotel}</b>` : ''} has been updated.`}</p>
        <div style="text-align: center; margin: 20px 0;">
            <span style="display: inline-block; background: ${color}; color: #fff; font-weight: bold; padding: 10px 28px; border-radius: 999px; font-size: 15px; letter-spacing: 0.3px;">${newStatus}</span>
        </div>
        ${(hotel || checkIn || checkOut) ? `<div style="background: #f8fafc; border-radius: 10px; padding: 14px 16px; margin: 0 0 20px;">${hotel ? `<p style="color: #334155; font-size: 14px; margin: 0 0 4px;"><b>Hotel:</b> ${hotel}</p>` : ''}${(checkIn || checkOut) ? `<p style="color: #334155; font-size: 14px; margin: 0;"><b>Dates:</b> ${checkIn || '—'} → ${checkOut || '—'}</p>` : ''}</div>` : ''}
        ${contactBlockGeneral}
        <div style="text-align: center; margin-top: 24px;">
            <a href="https://ostravel.pk/dashboard" style="background: #2563eb; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px;">View My Request</a>
        </div>
        <p style="color: #475569; font-size: 14px; margin: 24px 0 0;">Best regards,<br/><b>OS Travel and Tours Team</b></p>
    `;

    try {
        await transporter.sendMail({ from: FROM_ADDRESS, to, subject: isCompleted ? '🕋 Your Umrah Package Is Confirmed!' : `Your Umrah Request Status: ${newStatus}`, html: wrapEmail(body) });
        res.json({ success: true });
    } catch (err) {
        console.error('Email send error (umrah-status-update):', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- Admin Message Email (Visa) ---
router.post('/application-message', async (req, res) => {
    const { to, applicantName, applicationNumber, country, message } = req.body;
    if (!to || !message) return res.status(400).json({ success: false, message: 'Missing required fields' });

    const body = `
        <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 12px;">Dear ${applicantName || 'Applicant'},</p>
        <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 16px;">You have a new message from our team regarding your visa application ${applicationNumber ? `<b>${applicationNumber}</b>` : ''}${country ? ` (${country})` : ''}:</p>
        <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 16px; margin: 0 0 20px; border-radius: 0 6px 6px 0; color: #92400e; font-size: 14px; white-space: pre-wrap;">📋 ${message}</div>
        ${contactBlockGeneral}
        <div style="text-align: center; margin-top: 24px;">
            <a href="https://ostravel.pk/dashboard" style="background: #2563eb; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px;">Go to My Dashboard</a>
        </div>
        <p style="color: #475569; font-size: 14px; margin: 24px 0 0;">Best regards,<br/><b>OS Travel and Tours Team</b></p>
    `;

    try {
        await transporter.sendMail({ from: FROM_ADDRESS, to, subject: 'Action Required: New Message About Your Visa Application', html: wrapEmail(body) });
        res.json({ success: true });
    } catch (err) {
        console.error('Email send error (application-message):', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- Umrah Admin Message Email ---
router.post('/umrah-message', async (req, res) => {
    const { to, applicantName, hotel, message } = req.body;
    if (!to || !message) return res.status(400).json({ success: false, message: 'Missing required fields' });

    const body = `
        <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 12px;">Dear ${applicantName || 'Guest'},</p>
        <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 16px;">You have a new message from our team regarding your Umrah package request${hotel ? ` (<b>${hotel}</b>)` : ''}:</p>
        <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 14px 16px; margin: 0 0 20px; border-radius: 0 6px 6px 0; color: #1e3a8a; font-size: 14px; white-space: pre-wrap;">💬 ${message}</div>
        ${contactBlockGeneral}
        <div style="text-align: center; margin-top: 24px;">
            <a href="https://ostravel.pk/dashboard" style="background: #2563eb; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px;">View My Request</a>
        </div>
        <p style="color: #475569; font-size: 14px; margin: 24px 0 0;">Best regards,<br/><b>OS Travel and Tours Team</b></p>
    `;

    try {
        await transporter.sendMail({ from: FROM_ADDRESS, to, subject: 'New Message About Your Umrah Request', html: wrapEmail(body) });
        res.json({ success: true });
    } catch (err) {
        console.error('Email send error (umrah-message):', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- Document Verified Email ---
router.post('/verify-document', async (req, res) => {
    const { to, applicantName, applicationNumber, country, docLabel, allVerified } = req.body;
    if (!to || !docLabel) return res.status(400).json({ success: false, message: 'Missing required fields' });

    const body = `
        <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 12px;">Dear ${applicantName || 'Applicant'},</p>
        <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 16px;">Great news! Your <b>${docLabel}</b> has been successfully verified ✅ for your visa application ${applicationNumber ? `<b>${applicationNumber}</b>` : ''}${country ? ` (${country})` : ''}.</p>
        ${allVerified
            ? `<div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 14px 16px; margin: 0 0 20px; border-radius: 0 6px 6px 0; color: #065f46; font-size: 14px;">🎉 All your documents have been verified! Our team will now proceed with processing your visa application.</div>`
            : `<div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 16px; margin: 0 0 20px; border-radius: 0 6px 6px 0; color: #1e3a8a; font-size: 14px;">Our team is still reviewing your remaining documents. You'll be notified as each one is verified.</div>`
        }
        ${contactBlockVisa}
        <div style="text-align: center; margin-top: 24px;">
            <a href="https://ostravel.pk/dashboard" style="background: #2563eb; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px;">View My Application</a>
        </div>
        <p style="color: #475569; font-size: 14px; margin: 24px 0 0;">Best regards,<br/><b>OS Travel and Tours Team</b></p>
    `;

    try {
        await transporter.sendMail({ from: FROM_ADDRESS, to, subject: allVerified ? '✅ All Documents Verified — Your Application Is Being Processed' : `✅ Document Verified: ${docLabel}`, html: wrapEmail(body) });
        res.json({ success: true });
    } catch (err) {
        console.error('Email send error (verify-document):', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// =====================================================================
// --- NEW: Interview Documents Email ---
// Sent by admin/sub-admin ONLY while a visa application is in the
// "Interview" status. Lets staff push one or more files (e.g. interview
// call letter, checklist, sample answers) straight to the applicant's
// inbox, each with its own name/label. All docs are also saved onto the
// Firestore doc (see VisaInterviewDocuments.jsx) so they show up on the
// user's dashboard as well — this route just handles the email side.
// =====================================================================
router.post('/interview-documents', async (req, res) => {
    const {
        to, applicantName, applicationNumber, country, visaType,
        note,        // string | null — optional free-text details from admin
        documents,   // [{ name, url, fileName }] — required, at least 1
    } = req.body;

    if (!to || !Array.isArray(documents) || documents.length === 0) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const docListHtml = documents.map(d =>
        `<li style="margin-bottom: 6px; color: #334155; font-size: 14px;"><b>${d.name || 'Document'}</b></li>`
    ).join('');

    const body = `
        <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 12px;">Dear ${applicantName || 'Applicant'},</p>
        <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 16px;">
            Ahead of your interview for visa application ${applicationNumber ? `<b>${applicationNumber}</b>` : ''}${country ? ` (${country}${visaType ? ', ' + visaType : ''})` : ''},
            our team has sent you the following document(s):
        </p>
        <div style="background: #faf5ff; border-left: 4px solid #a855f7; border-radius: 0 8px 8px 0; padding: 14px 16px; margin: 0 0 20px;">
            <p style="color: #6b21a8; font-size: 14px; margin: 0 0 8px; font-weight: bold;">📎 ${documents.length} document(s) attached to this email</p>
            <ul style="margin: 0; padding-left: 18px;">${docListHtml}</ul>
        </div>
        ${note ? `<div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 16px; margin: 0 0 20px; border-radius: 0 6px 6px 0; color: #92400e; font-size: 14px; white-space: pre-wrap;">📋 ${note}</div>` : ''}
        <p style="color: #64748b; font-size: 13px; margin: 0 0 20px;">You can also view and download these documents anytime from your dashboard.</p>
        ${contactBlockVisa}
        <div style="text-align: center; margin-top: 24px;">
            <a href="https://ostravel.pk/dashboard" style="background: #2563eb; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px;">View My Application</a>
        </div>
        <p style="color: #475569; font-size: 14px; margin: 24px 0 0;">Best regards,<br/><b>OS Travel and Tours Team</b></p>
    `;

    try {
        // Fetch every document and attach it. Fetches run in parallel;
        // any single failure is dropped rather than failing the whole email.
        const fetched = await Promise.all(
            documents.map(d => fetchAttachment(d.url, d.fileName || d.name || 'document'))
        );
        const attachments = fetched
            .filter(Boolean)
            .map(a => ({ filename: a.filename, content: a.content, contentType: a.contentType }));

        await transporter.sendMail({
            from: FROM_ADDRESS,
            to,
            subject: `Interview Documents — ${applicationNumber || 'Your Visa Application'}`,
            html: wrapEmail(body),
            attachments,
        });
        res.json({ success: true, attached: attachments.length, requested: documents.length });
    } catch (err) {
        console.error('Email send error (interview-documents):', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- Consolidated Update Email (Visa) ---
router.post('/consolidated-update', async (req, res) => {
    const {
        to, applicantName, applicationNumber, country, visaType,
        statusChange,     // { oldStatus, newStatus } | null
        editAccess,       // { enabled, reason } | null
        message,          // string | null
        documentActions,  // [{ docLabel, action: 'verified' | 'reupload_requested' | 'deleted', message? }]
        reuploadDocs,     // string[] | null
        decisionDocURL,   // string | null — URL of approved visa / rejection letter
        decisionDocName,  // string | null — filename for attachment
    } = req.body;

    if (!to) return res.status(400).json({ success: false, message: 'Missing required fields' });

    const statusColors = {
        'Doc Received': '#3b82f6', 'Analyzing': '#f59e0b', 'Req Document': '#fb923c',
        'Visa in Process': '#6366f1', 'Interview': '#a855f7', 'Approve': '#10b981', 'Reject': '#ef4444',
    };

    const sections = [];

    // --- Status change block ---
    if (statusChange && statusChange.newStatus) {
        const color = statusColors[statusChange.newStatus] || '#334155';
        const isApproved = statusChange.newStatus === 'Approve';
        const isRejected = statusChange.newStatus === 'Reject';
        sections.push(`
            <div style="margin: 0 0 22px;">
                <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 10px;"><b>📌 Application Status Updated</b></p>
                ${isApproved ? '<p style="color: #1a1a1a; font-size: 15px; margin: 0 0 10px;">🎉 Congratulations! Your visa application has been <b>APPROVED!</b></p>' : ''}
                ${isRejected ? '<p style="color: #1a1a1a; font-size: 15px; margin: 0 0 10px;">We regret to inform you that your visa application has been <b>rejected</b>.</p>' : ''}
                <div style="text-align: center; margin: 12px 0;">
                    <span style="display: inline-block; background: ${color}; color: #fff; font-weight: bold; padding: 8px 22px; border-radius: 999px; font-size: 14px; letter-spacing: 0.3px;">
                        ${statusChange.newStatus}
                    </span>
                </div>
                ${(isApproved || isRejected) && decisionDocURL ? `
                <div style="background: ${isApproved ? '#f0fdf4' : '#fef2f2'}; border-left: 4px solid ${isApproved ? '#10b981' : '#ef4444'}; border-radius: 0 8px 8px 0; padding: 12px 14px; margin-top: 12px;">
                    <p style="color: ${isApproved ? '#065f46' : '#991b1b'}; font-size: 14px; margin: 0; font-weight: bold;">
                        📎 ${isApproved ? 'Your approved visa letter is attached to this email.' : 'Your rejection letter is attached to this email.'}
                    </p>
                    <p style="color: #64748b; font-size: 13px; margin: 4px 0 0;">You can also view and download it from your dashboard.</p>
                </div>` : ''}
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

    // --- Re-uploadable documents block ---
    if (Array.isArray(reuploadDocs) && reuploadDocs.length > 0) {
        const docItems = reuploadDocs.map(label =>
            `<li style="margin-bottom: 6px; color: #1e40af; font-size: 14px; font-weight: 600;">📎 ${label}</li>`
        ).join('');
        sections.push(`
            <div style="margin: 0 0 22px;">
                <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 8px;"><b>📤 Documents You Can Re-Upload</b></p>
                <p style="color: #334155; font-size: 14px; margin: 0 0 10px;">
                    Please log in to your dashboard and re-upload the following document(s):
                </p>
                <div style="background: #eff6ff; border-left: 4px solid #2563eb; border-radius: 0 8px 8px 0; padding: 12px 16px;">
                    <ul style="margin: 0; padding-left: 16px;">${docItems}</ul>
                </div>
                <p style="color: #64748b; font-size: 13px; margin: 8px 0 0;">
                    ⚠️ Only the documents listed above are open for re-upload. Others remain locked.
                </p>
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
        const mailOptions = {
            from: FROM_ADDRESS,
            to,
            subject: `Update on Your Visa Application${applicationNumber ? ' — ' + applicationNumber : ''}`,
            html: wrapEmail(body),
        };

        // Attach decision document if provided (for Approve/Reject status)
        const newStatus = statusChange?.newStatus;
        if ((newStatus === 'Approve' || newStatus === 'Reject') && decisionDocURL) {
            const attachment = await fetchAttachment(
                decisionDocURL,
                decisionDocName || (newStatus === 'Approve' ? 'approved_visa.pdf' : 'rejection_letter.pdf')
            );
            if (attachment) {
                mailOptions.attachments = [{
                    filename: attachment.filename,
                    content: attachment.content,
                    contentType: attachment.contentType,
                }];
            }
        }

        await transporter.sendMail(mailOptions);
        res.json({ success: true });
    } catch (err) {
        console.error('Email send error (consolidated-update):', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- Consolidated Update Email (Umrah) ---
// Mirrors /consolidated-update above, but for the Umrah field shape (hotel/
// checkIn/checkOut instead of country/visaType, plus an optional payment
// request block). Bundles status change + document actions + payment
// request into ONE email, fired only from the front-end's per-row "Notify"
// button — never automatically by individual admin actions.
router.post('/umrah-consolidated-update', async (req, res) => {
    const {
        to, applicantName, requestNumber, hotel, checkIn, checkOut,
        statusChange,     // { oldStatus, newStatus } | null
        documentActions,  // [{ docLabel, action: 'requested' | 'verified' | 'rejected' | 'removed', message? }]
        paymentChange,    // { amount, note } | null
    } = req.body;

    if (!to) return res.status(400).json({ success: false, message: 'Missing required fields' });

    const statusColors = {
        'Pending Review': '#f59e0b', 'Processing': '#3b82f6', 'Documents Required': '#fb923c',
        'Payment Requested': '#8b5cf6', 'Paid': '#10b981', 'Completed': '#0d9488', 'Rejected': '#ef4444',
    };

    const sections = [];

    // --- Status change block ---
    if (statusChange && statusChange.newStatus) {
        const color = statusColors[statusChange.newStatus] || '#334155';
        const isCompleted = statusChange.newStatus === 'Completed';
        const isRejected = statusChange.newStatus === 'Rejected';
        sections.push(`
            <div style="margin: 0 0 22px;">
                <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 10px;"><b>📌 Request Status Updated</b></p>
                ${isCompleted ? '<p style="color: #1a1a1a; font-size: 15px; margin: 0 0 10px;">🎉 Great news! Your Umrah package request has been finalized.</p>' : ''}
                ${isRejected ? '<p style="color: #1a1a1a; font-size: 15px; margin: 0 0 10px;">We regret to inform you that this request has been <b>rejected</b>.</p>' : ''}
                <div style="text-align: center; margin: 12px 0;">
                    <span style="display: inline-block; background: ${color}; color: #fff; font-weight: bold; padding: 8px 22px; border-radius: 999px; font-size: 14px; letter-spacing: 0.3px;">
                        ${statusChange.newStatus}
                    </span>
                </div>
            </div>
        `);
    }

    // --- Payment request block ---
    if (paymentChange && paymentChange.amount) {
        sections.push(`
            <div style="margin: 0 0 22px;">
                <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 8px;"><b>💳 Payment Requested</b></p>
                <div style="background: #faf5ff; border-left: 4px solid #8b5cf6; border-radius: 0 8px 8px 0; padding: 12px 14px; color: #5b21b6; font-size: 14px;">
                    <p style="margin: 0 0 4px;"><b>Amount Due:</b> PKR ${Number(paymentChange.amount).toLocaleString('en-PK')}</p>
                    ${paymentChange.note ? `<p style="margin: 4px 0 0;">${paymentChange.note}</p>` : ''}
                </div>
                <p style="color: #64748b; font-size: 13px; margin: 8px 0 0;">Log in to your dashboard to complete payment.</p>
            </div>
        `);
    }

    // --- Document actions block ---
    if (Array.isArray(documentActions) && documentActions.length > 0) {
        const rows = documentActions.map(a => {
            const tag = a.action === 'verified'
                ? '<span style="color:#10b981;">✅ Verified</span>'
                : a.action === 'requested'
                ? '<span style="color:#fb923c;">📤 Requested — please upload</span>'
                : a.action === 'rejected'
                ? '<span style="color:#ef4444;">⚠️ Rejected — please re-upload</span>'
                : a.action === 'removed'
                ? '<span style="color:#94a3b8;">🗑️ Removed</span>'
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
        <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 16px;">Dear ${applicantName || 'Guest'},</p>
        <p style="color: #1a1a1a; font-size: 15px; margin: 0 0 20px;">
            Here is a summary of the latest updates on your Umrah request
            ${requestNumber ? `<b>${requestNumber}</b>` : ''}${hotel ? ` (${hotel})` : ''}:
        </p>
        ${sections.join('')}
        ${(checkIn || checkOut) ? `<div style="background: #f8fafc; border-radius: 10px; padding: 14px 16px; margin: 0 0 20px;"><p style="color: #334155; font-size: 14px; margin: 0;"><b>Dates:</b> ${checkIn || '—'} → ${checkOut || '—'}</p></div>` : ''}
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
            subject: `Update on Your Umrah Request${requestNumber ? ' — ' + requestNumber : ''}`,
            html: wrapEmail(body),
        });
        res.json({ success: true });
    } catch (err) {
        console.error('Email send error (umrah-consolidated-update):', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;