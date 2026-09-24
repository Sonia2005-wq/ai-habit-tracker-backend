import mongoose from 'mongoose'; 

export const connectDB = async () => {
    try{
        const url = process.env.MONGO_URL; 
        if(!url) throw new Error("MONGO_URL is not defined"); 
        const conn = await mongoose.connect(url); 
        console.log(`MongoDB connected: ${conn.connection.host}`); 
    }
    catch(err){
        console.error("MongoDB connection error: ", err.message); 
        process.exit(1) ;
    }
}