var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var UserSchema = new mongoose.Schema({
  username: String,
  name: String,
  email:{
    type: String,
    unique: true,
    required: true
  },
  password:String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  active: {
    type: Boolean,
    required: true,
    default: false
  },
  activeToken:String,
  activeTokenExpires:String,
  isAdmin: {
    type: Boolean,
    required: true,
    default: false
  }
});

UserSchema.plugin(passportLocalMongoose)

module.exports = mongoose.model("User", UserSchema);
