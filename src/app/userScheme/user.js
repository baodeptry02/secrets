const mongoose = require("mongoose");

const passportLocalMongoose = require("passport-local-mongoose")

// setup new user database
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    require: true,
    unique: true,
    minlength: 3,
  },
  gender: 
  {
    type : String
  },
  age: {
    type: Number,
  },

  password: {
    type: String
  },
},
{
  timestamps: true,
}
);

userSchema.plugin(passportLocalMongoose); //dùng để hash và salt password rồi lưu vào mongoDB

//setup new user model
const User = mongoose.model("User", userSchema); //User là tên của module

module.exports = User;