var express = require("express");
var router  = express.Router();
var passport = require("passport");
var User = require("../models/user");
var middleware = require("../middleware");
var request = require('request');
var async = require("async");
var nodemailer = require("nodemailer");
var crypto = require("crypto");


router.get("/", function(req, res) {
  res.render("home");
});

// show register form
router.get("/register", function(req, res){
   res.render("register");
});

//handle sign up logic
router.post("/register", middleware.checkSignupInfo, function(req, res){
  const captcha = req.body["g-recaptcha-response"];
  console.log(captcha);
  if (!captcha) {
    console.log(req.body);
    req.flash("error", "Please select captcha");
    return res.redirect("/register");
  }
  // secret key
  var secretKey = process.env.CAPTCHA;
  // Verify URL
  var verifyURL = 'https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captcha}&remoteip=${req.connection.remoteAddress}';
  // Make request to Verify URL
  request.get(verifyURL, (err, response, body) => {
    // if not successful
    if (body.success !== undefined && !body.success) {
      req.flash("error", "Captcha Failed");
      return res.redirect("/register");
    }
    var newUser = new User({
      username: req.body.username,
      name: req.body.name,
      email:req.body.email
    });
    if (req.body.password===req.body.chkpassword) { //
      User.register(newUser, req.body.password, function(err, user){
        if(err){
          console.log(err);
          req.flash("error", err.message);
          res.redirect("/register");
        } else {
          passport.authenticate("local")(req, res, function(){ //
            req.flash("success", "Welcome to YelpCamp " + user.username);
            res.redirect("/campgrounds");
          });
        }
      });
    } else {
      req.flash("error", "Passwords Don't Match");
      res.redirect("/register");
    }
  });
});

// show login form
router.get("/login", function(req, res){
   res.render("login");
});

// handling login logic
router.post("/login", passport.authenticate("local", {
  successRedirect: "/campgrounds",
  failureRedirect: "/login",
  failureFlash: 'Invalid username or password.'}), function(req, res){
});

// logout route
router.get("/logout", function(req, res){
  req.logout();
  req.flash("success", "Logged you out!");
  res.redirect("/campgrounds");
});

// forgot password
router.get('/forgot', function(req, res) {
  res.render('forgot');
});

//forgot password e-mail
router.post('/forgot', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: "hotmail",
        auth: {
          user: process.env.EMAIL,
          pass: process.env.EMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: process.env.EMAIL,
        subject: 'YelpCamp Password Reset',
        text: 'Hello '+ user.username +',\n\n'+
          'You are receiving this because you (or someone else) have requested to reset the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        console.log('mail sent');
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});

//RESET Password Form
router.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', {token: req.params.token});
  });
});

//RESET PASSWORD
router.post('/reset/:token', middleware.checkPassword, function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }
        if(req.body.password === req.body.confirm) {
          user.setPassword(req.body.password, function(err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
          })
        } else {
            req.flash("error", "Passwords do not match.");
            return res.redirect('back');
        }
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
          user: process.env.EMAIL,
          pass: process.env.EMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: process.env.EMAIL,
        subject: 'Your YelpCamp password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/campgrounds');
  });
});



module.exports = router;
