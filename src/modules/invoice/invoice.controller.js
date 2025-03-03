import { invoiceModel } from "../../../dataBase/models/invoice.model.js";
import { catchAsyncError } from "../../middleware/catchAsyncError.js";
import { AppError } from "../../utils/AppError.js";
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { fileURLToPath } from "url";
import { dirname } from "path";
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcodeTerminal from 'qrcode-terminal';

// إعداد عميل WhatsApp مع التخزين المحلي للجلسة
const client = new Client({
    authStrategy: new LocalAuth()
});
let clientReady = false;

client.on('qr', (qr) => {
    qrcodeTerminal.generate(qr, { small: true });
    console.log('QR RECEIVED. Please scan the QR code.');
});

client.on('ready', () => {
    console.log('Client is ready!');
    clientReady = true; // تأكد من أن العميل جاهز
});

client.on('message', msg => {
    if (msg.body === '!ping') {
        msg.reply('pong');
    }
});

client.initialize();

/// جميع APIs الخاصة بالفواتير
const getInvoice = catchAsyncError(async (req, res, next) => {
    let invoices = await invoiceModel.find().populate('user_id');
    if (!invoices) {
        return next(new AppError('Invoice not fetched', 400));
    }
    res.status(200).json({ message: "Invoices fetched successfully", invoices });
});

const getInvoiceById = catchAsyncError(async (req, res, next) => {
    const { id } = req.params;
    let invoice = await invoiceModel.findById(id).populate('user_id');
    if (!invoice) {
        return next(new AppError('Invoice not fetched', 400));
    }
    res.status(200).json({ message: "Invoice fetched successfully", invoice });
});

const createInvoice = catchAsyncError(async (req, res, next) => {
    const { user_id, invoice_id, invoice_date, currency, status, products } = req.body;
    if (!products || !invoice_id || !user_id || !Array.isArray(products)) {
        return next(new AppError("Missing required fields", 400));
    }

    // حساب المبلغ الإجمالي
    let total_amount = 0;

    for (const product of products) {
        const { product_id, quantity, price } = product;
        if (!product_id || !quantity || !price) {
            return next(new AppError('Missing product details', 400));
        }
        total_amount += quantity * price;
    }
    
    const newInvoice = await invoiceModel.create({
        user_id,
        invoice_id,
        total_amount,
        invoice_date,
        currency,
        status,
        products
    });

    if (!newInvoice) {
        return next(new AppError('Invoice not added', 400));
    }

    res.status(200).json({ message: "Invoice added successfully", newInvoice });
});

const updateInvoice = catchAsyncError(async (req, res, next) => {
    const { id } = req.params;
    let invoice = await invoiceModel.findByIdAndUpdate(id, req.body, { new: true });
    if (!invoice) {
        return next(new AppError('Invoice not updated', 400));
    }
    res.status(200).json({ message: "Invoice updated successfully", invoice });
});

const deleteInvoice = catchAsyncError(async (req, res, next) => {
    const { id } = req.params;
    let invoice = await invoiceModel.findByIdAndDelete(id);
    if (!invoice) {
        return next(new AppError('Invoice not deleted', 400));
    }
    res.status(200).json({ message: "Invoice deleted successfully", invoice });
});

// وظيفة لتوليد PDF
const generateInvoicePDF = (invoiceData, filePath) => {
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(filePath));

    // إعدادات الوثيقة
    doc.fontSize(20).text('Invoice Generator', { align: 'center' });
    doc.moveDown(1);

    // معلومات الفاتورة
    doc.fontSize(14).text(`Date: ${invoiceData.invoice_date}`);
    doc.text(`Invoice #: ${invoiceData.invoice_id}`);
    doc.moveDown(1);

    doc.text('From:', { underline: true });
    doc.text(`Name: ${invoiceData.user_id.name}`);
    doc.text(`Email: ${invoiceData.user_id.email}`);
    doc.moveDown(1);

    // قائمة المنتجات
    doc.text('Products:', { underline: true });
    invoiceData.products.forEach((product) => {
        doc.text(`${product.product_id.name} - ${product.quantity} x ${product.price} = ${product.quantity * product.price}`);
    });

    // المبلغ الإجمالي
    doc.moveDown(1);
    doc.text(`Total: ${invoiceData.total_amount}`, { bold: true });
    doc.end();
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const generateInvoicepdf = catchAsyncError(async (req, res, next) => {
    const { id } = req.params;
    let invoice = await invoiceModel.findById(id).populate('user_id');
    if (!invoice) {
        return next(new AppError('Invoice not fetched', 400));
    }
    
    const dirPath = path.join(__dirname, 'invoices'); // Define the directory path
    const filePath = path.join(dirPath, `${invoice.invoice_id}.pdf`);

    try {
        await fsPromises.mkdir(dirPath, { recursive: true });
    } catch (error) {
        console.log('Error creating directory', error);
        return next(new AppError('Failed to create directory for invoice', 500));
    }

    generateInvoicePDF(invoice, filePath);
    
    // إرسال PDF كاستجابة لتحميله
    res.download(filePath, `${invoice.invoice_id}.pdf`, (err) => {
        if (err) {
            return next(new AppError('Failed to download the invoice', 500));
        }
    });
});

// وظيفة لإرسال الفاتورة عبر WhatsApp
const sendInvoiceByWhatsApp = catchAsyncError(async (req, res, next) => {
    const { id, phone } = req.params; // استقبال id ورقم الهاتف
    const invoice = await invoiceModel.findById(id).populate('user_id');

    if (!invoice) {
        return next(new AppError('Invoice not found', 404));
    }

    const messageBody = `
    Invoice #: ${invoice.invoice_id}
    Date: ${invoice.invoice_date}
    Total Amount: ${invoice.total_amount} ${invoice.currency}
    Products: ${invoice.products.map(product => `${product.product_id.name} 
               - ${product.quantity} x ${product.price} = ${product.quantity * product.price}`).join('\n')}
    `;

    if (!clientReady) {
        console.log('WhatsApp client is not ready');
        return next(new AppError('WhatsApp client is not ready', 500));
    }

    try {
        // إرسال PDF كملف مرفق
        await client.sendMessage(`whatsapp:${phone}`, {
            caption: messageBody, // نص الرسالة
            document: fs.readFileSync(path.join(__dirname, 'invoices', `${invoice.invoice_id}.pdf`)) // مسار ملف PDF
        });
        res.status(200).json({ message: "Invoice sent by WhatsApp successfully!" });
    } catch (error) {
        console.error(error);
        return next(new AppError("Failed to send invoice by WhatsApp", 500));
    }
});

export { 
    getInvoice, 
    getInvoiceById, 
    createInvoice, 
    updateInvoice, 
    deleteInvoice, 
    generateInvoicepdf, 
    sendInvoiceByWhatsApp 
};