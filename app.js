require('dotenv').config();

const express          = require('express'),
mongoose               = require('mongoose'),
passport               = require('passport'),
flash                  = require('connect-flash'),
bodyParser             = require('body-parser'),
LocalStrategy          = require('passport-local').Strategy,
methodOverride         = require("method-override"),
expressValidator       = require('express-validator');
Campground             = require('./models/campground'),
Comment                = require('./models/comment'),
User                   = require('./models/user'),
seedDB                 = require('./seeds');


var app = express();
//requring routes
var commentRoutes    = require("./routes/comments"),
campgroundRoutes     = require("./routes/campgrounds"),
indexRoutes          = require("./routes/index");

var url = process.env.DATABASEURL || "mongodb://localhost/yelp_camp"
mongoose.connect(url);

// seedDB(); //seed the DB
app.set("view engine", "ejs");
app.use(methodOverride("_method"));
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(expressValidator());
app.use(flash());

app.locals.moment = require('moment');
// PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: "I love Cupcakes",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use(function(req, res, next) {
  res.locals.currentUser = req.user;
  res.locals.error = req.flash("error");
  res.locals.success = req.flash("success");
  next();
});

app.use("/", indexRoutes);
app.use("/campgrounds", campgroundRoutes);
app.use("/campgrounds/:id/comments", commentRoutes);

app.listen(process.env.port || 2700,  function(){
  console.log("Server Started");
});
