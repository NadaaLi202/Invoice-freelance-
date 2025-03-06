import { globalErrorMiddleware } from "../middleware/globalErrorMiddleware.js"
import { AppError } from "../utils/AppError.js"
import authRouter from "./auth/auth.router.js"
import  invoiceRouter  from "./invoice/invoice.router.js"
import productRouter from "./product/product.router.js"
import { userRouter } from "./user/user.router.js"




export function routes (app) {

app.use('/api/v1/users',userRouter)
app.use('/api/v1/auth',authRouter)
app.use('/api/v1/invoices',invoiceRouter)
app.use('/api/v1/products',productRouter)
console.log('hello')

    app.use('*', (req,res,next) => {
        // res.status(404).json({message : 'Route not found'})
        next(new AppError(`Route ${req.originalUrl} not found`,404))
    })
    // global error handling middleware
    app.use(globalErrorMiddleware)
}