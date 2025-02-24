import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema({

    invoice_id : {
        type:String,
        required: true,
        unique: true
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref : 'user',
        required: true
    },
    invoice_date: {
        type: Date,
        required: true
    },
    total_amount: {
        type: Number,
    },
    currency: {
        type: String,
        enum: ['USD', 'EUR', 'GBP', 'EG', 'AUD'], 
        required: true

    },
    status: {
        type:String,
        enum: ['paid','notPaid'],
        default: 'paid'
    },
   products : [{
       product_id : {
           type: mongoose.Schema.Types.ObjectId,
           ref : 'product',
           required: true
       },
       quantity : {
           type: Number,
           required: true,
           min: [1, 'Product quantity must be at least 1']
       },
       price : {
           type: Number,
           required: true
       }
   }]

},{timestamps:true})
export const invoiceModel = mongoose.model('invoice',invoiceSchema)