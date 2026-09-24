import mongoose from "mongoose";
import bcrypt from "bcryptjs"; 

const userSchema = new mongoose.Schema({

    name : { type: String , required: true, trime : true}, 
    email: {
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true, 
        trim : true, 
    }, 
    password: { type: String, required: true, minLength: 6}, 
    avatar: {type: String, default: ""}, 
    morningMotivation: {type: Boolean, default: false}, 
}, 
{timestamps: true}
); 

userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) return next(); 
    const salt = await bcrypt.genSalt(10); 
    this.password = await bcrypt.hash(this.password, salt); 
    next(); 
});

userSchema.methods.matchPassword = function (plain){
    return bcrypt.compare(plain, this.password); 
};

userSchema.methods.toJSON = function (){
    const obj = this.toObject(); 
    delete obj.password; 
    return obj; 
}; 

export default mongoose.model("user", userSchema); 