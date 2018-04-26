var Campground = require("../models/campground");
var Comment = require("../models/comment");
var User = require("../models/user");

// all the middleare goes here
var middlewareObj = {};

middlewareObj.checkSignupInfo = function(req, res, next){[
  req.check('username', 'Invalid Username')
    .matches(/^[aA-zZ0-9_-]{3,15}$/)
    .custom(value => {
    return User.find({"username": value}).then(user => {
      throw new Error('username already exists');
    })
  }),

  req.check('email', 'Invalid Email')
    .isEmail()
    .trim()
    .normalizeEmail()
    .custom(value => {
      return User.find({"email": value}).then(user => {
        throw new Error('this email is already in use');
      })
    }),
  // General error messages can be given as a 2nd argument in the check APIs
  req.check('password')
    .matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[$@$!%*?&])[A-Za-z\d$@$!%*?&]{8,15}/).withMessage('Password: Invalid')
  ]
  // Get the validation result whenever you want; see the Validation Result API for all options!
  const errors = req.validationErrors();
  if (errors) {
    err=[]
    for (var i = 0; i < errors.length; i++) {
      err.push(errors[i].msg)
    }
    console.log(err);
    req.flash("error", err);
    res.redirect("/register");
  } else {
    next();
  }
}

middlewareObj.checkPassword = function(req, res, next){[
  req.check('password')
    .matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[$@$!%*?&])[A-Za-z\d$@$!%*?&]{8,15}/).withMessage('Password: Minimum eight characters, at least one uppercase letter, one lowercase letter, one number and one special character')
  ]
  // Get the validation result whenever you want; see the Validation Result API for all options!
  const errors = req.validationErrors();
  if (errors) {
    err=[]
    for (var i = 0; i < errors.length; i++) {
      err.push(errors[i].msg)
    }
    console.log(err);
    req.flash("error", err);
    res.redirect("back");
  } else {
    next();
  }
}


// middlewareObj.activateAccount= function(req, res, next){
//   async.waterfall([
//     function(newUser, done) {
//       crypto.randomBytes(20, function(err, buf) {
//         var token = buf.toString('hex');
//         done(err, token);
//       });
//     },
//     function(newUser, token, done) {
//       newUser.activeToken = token;
//       newUser.activeTokenExpires = Date.now() + 7200000; // 2 hours
//       var smtpTransport = nodemailer.createTransport({
//         service: "hotmail",
//         auth: {
//           user: process.env.EMAIL,
//           pass: process.env.EMAILPW
//         }
//       });
//       var mailOptions = {
//         to: newUser.email,
//         from: process.env.EMAIL,
//         subject: 'Confirm Your Account on YelpCamp',
//         text: 'Hello '+ newUser.username +',\n\n'+
//           'Thanks for signing up with  YelpCamp! You must follow this link to activate your account\n\n' +
//           'http://' + req.headers.host + '/activate/' + token + '\n\n' +
//       };
//       smtpTransport.sendMail(mailOptions, function(err) {
//         console.log('mail sent');
//         req.flash('success', 'An e-mail has been sent to ' + newUser.email + ' with a link to activate your account.');
//         done(err, 'done');
//       });
//     }
//   ]
// }

middlewareObj.checkCampgroundOwnership = function(req, res, next) {
 if(req.isAuthenticated()){
  Campground.findById(req.params.id, function(err, foundCampground){
    if(err || !foundCampground){
      req.flash("error", "Campground not found");
      res.redirect("back");
    }  else {
      // does user own the campground?
      if(foundCampground.author.id.equals(req.user._id)) {
        next();
      } else {
        req.flash("error", "You don't have permission to do that");
        res.redirect("back");
      }
    }
  });
  } else {
    req.flash("error", "You need to be logged in to do that");
    res.redirect("back");
  }
}

middlewareObj.checkCommentOwnership = function(req, res, next) {
 if(req.isAuthenticated()){
    Comment.findById(req.params.comment_id, function(err, foundComment){
      if(err){
        res.redirect("back");
      }  else {
        // does user own the comment?
        if(foundComment.author.id.equals(req.user._id)) {
          next();
        } else {
          req.flash("error", "You don't have permission to do that");
          res.redirect("back");
        }
      }
    });
  } else {
    req.flash("error", "You need to be logged in to do that");
    res.redirect("back");
  }
}

middlewareObj.isLoggedIn = function(req, res, next){
  if(req.isAuthenticated()){
    return next();
  }
  req.flash("error", "You need to be logged in to do that");
  res.redirect("/login");
}

middlewareObj.deleteComments = function(req, res, next){
  Campground.findById(req.params.id, function(err, campground) {
    if(err) {
      req.flash("error", err.message);
      return res.redirect("back");
    } else {
      for (var i = 0; i < campground.comments.length; i++) {
        id=campground.comments[i].toString();
        console.log(id);
        Comment.findById(id, function (err, comment) {
          if (err){
            req.flash("error", err.message);
            return res.redirect("back");
          } else {
            comment.remove();
          }
        });
      }
      next();
    }
  });
}

module.exports = middlewareObj;
