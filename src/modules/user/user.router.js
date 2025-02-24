import express from "express"
import { addUser, deleteUser, getAllUsers, getUserById, updateUser } from "./user.controller.js";



export const userRouter = express.Router();

userRouter.post('/',addUser)
userRouter.get('/',getAllUsers)
userRouter.get('/:id',getUserById)
userRouter.put('/:id',updateUser)
userRouter.delete('/:id',deleteUser)



