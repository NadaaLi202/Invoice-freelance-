



import express from "express";
import { createInvoice, deleteInvoice, generateInvoicepdf, getInvoice, getInvoiceById, sendInvoiceByWhatsApp, updateInvoice } from "./invoice.controller.js";
import { allowedTo, protectedRoutes } from "../auth/auth.controller.js";

const invoiceRouter = express.Router(); 

invoiceRouter.get('/',protectedRoutes,allowedTo('admin'),getInvoice)
invoiceRouter.get('/:id',getInvoiceById)
invoiceRouter.post('/',createInvoice)
invoiceRouter.put('/:id',protectedRoutes,allowedTo('admin'),updateInvoice)
invoiceRouter.delete('/:id',protectedRoutes,allowedTo('admin'),deleteInvoice)
invoiceRouter.get('/pdf/:id',generateInvoicepdf)
invoiceRouter.post('/:id/:phone',sendInvoiceByWhatsApp)

export default invoiceRouter;