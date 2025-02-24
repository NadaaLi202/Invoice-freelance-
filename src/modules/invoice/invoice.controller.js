import { invoiceModel } from "../../../dataBase/models/invoice.model.js";
import { catchAsyncError } from "../../middleware/catchAsyncError.js";
import { AppError } from "../../utils/AppError.js";
import PDFDocument from 'pdfkit';
import fs from 'fs'
import path from 'path'
import {promises as fsPromises} from 'fs'
import { fileURLToPath } from "url";
import { dirname } from "path";




const getInvoice = catchAsyncError(async(req,res,next) => {


    let invoices = await invoiceModel.find().populate('user_id')
    if(!invoices) {
        return next (new AppError('Invoice not fetch'),400)
    }
    res.status(200).json({message:"invoices fetched successfully",invoices})

})

const getInvoiceById = catchAsyncError(async(req,res,next) => {

    const {id} = req.params
    let invoice = await invoiceModel.findById(id).populate('user_id')
    if(!invoice) {
        return next (new AppError('Invoice not fetch'),400)
    }
    res.status(200).json({message:"invoices fetched successfully",invoice})
})


 const createInvoice =  catchAsyncError(async(req,res,next) => {

    const {user_id,invoice_id,invoice_date,currency,status,products} = req.body
    if (!products || !invoice_id || !user_id || !Array.isArray(products)){
        return next(new AppError("Missing required fields",400))
    }

    // calculate total amount

    let total_amount = 0;

    for (const product of products) {
        const { product_id , quantity , price} = product;
        if(!product_id || !quantity || !price) {
            return next (new AppError('Missing product details',400))
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
       
    })

    if(!newInvoice) {
        return next (new AppError('Invoice not added' ,400))
    }

    res.status(200).json({message:"Invoice added successfully",newInvoice})
})

const updateInvoice = catchAsyncError(async(req,res,next) => {
    

    const {id} = req.params
    let invoice = await invoiceModel.findByIdAndUpdate(id,req.body,{new : true})
    if(!invoice) {
        return next (new AppError('Invoice not updated' ,400))
    }
    res.status(200).json({message:"Invoice updated successfully",invoice})
})

const deleteInvoice = catchAsyncError(async(req,res,next) => {

    const {id} = req.params 
    let invoice = await invoiceModel.findByIdAndDelete(id)
    if(!invoice) {
        return next (new AppError('Invoice not deleted' ,400))
    }
    res.status(200).json({message:"Invoice deleted successfully",invoice})
})


// function to generate pdf

const generateInvoicePDF = (invoiceData, filePath) => {
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(filePath));

    doc.fontSize(20).text('Invoice Generator', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Date: ${invoiceData.invoice_date}`);
    doc.text(`Invoice #: ${invoiceData.invoice_id}`);
    doc.moveDown();
    doc.text('From:', { underline: true });
    // Assuming user data is populated
    doc.text(`Name: ${invoiceData.user_id.name}`);
    doc.text(`Email: ${invoiceData.user_id.email}`);
    doc.moveDown();
    doc.text('Products:', { underline: true });

    invoiceData.products.forEach((product) => {
        doc.text(`${product.product_id.name} - ${product.quantity} x ${product.price} = ${product.quantity * product.price}`);
    });

    doc.moveDown();
    doc.text(`Total: ${invoiceData.total_amount}`, { bold: true });
    doc.end();
};


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename)
const generateInvoicepdf = catchAsyncError(async(req,res,next) => {

const {id} = req.params
let invoice = await invoiceModel.findById(id).populate('user_id')
if(!invoice) {
    return next (new AppError('Invoice not fetched' ,400))
}
const dirPath = path.join(__dirname, 'invoices'); // Define the directory path
const filePath = path.join(dirPath, `${invoice.invoice_id}.pdf`);

try{
    await fsPromises.mkdir(dirPath, { recursive: true });

} catch (error) {
    console.log('Error creating directory',error)
    return next (new AppError('failed to create director for invoice ',500))
}

generateInvoicePDF(invoice,filePath)
res.status(200).json({message:"Invoice fetched successfully",filePath,invoice})


})

export {getInvoice,getInvoiceById,createInvoice,updateInvoice,deleteInvoice,generateInvoicepdf}