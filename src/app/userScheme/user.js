const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const encrypt = require("mongoose-encryption");

// setup new user database
const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

//secret String instead of two keys
// const secret = "Thisisourlittlesecret."; //secure key, dùng cái này để decrypt

// const secret = process.env.SECRET;

userSchema.plugin(encrypt, { 
  secret: process.env.SECRET,
  encryptedFields: ['password', 'username'] //này là thêm option để mã hoá, thì ở đây chúng ta sẽ chọn là mã hoá password (là cái key của object userSchema), còn muốn thêm option khác thì chứ viết thêm 1 chuỗi mới ở trong mảng đó
 }); //Usage mongoose-encryption
// Nên add plugin trước khi tạo moongose model (là cái ở dưới), thì trước khi khởi tạo thì userSchema đã đc mã hoá
// Nó sẽ được mã hoá tự động khi sử dụng method save(), và tự giải mã khi dùng method findOne

//setup new user model
const User = mongoose.model("User", userSchema); //User là tên của module

module.exports = User;
