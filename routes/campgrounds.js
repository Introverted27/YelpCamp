var express = require("express");
var router  = express.Router();
var Campground = require("../models/campground");
var middleware = require("../middleware");
var NodeGeocoder = require('node-geocoder');
var multer = require('multer');
var cloudinary = require('cloudinary');

var options = {
  provider: 'google',
  httpAdapter: 'https',
  apiKey: process.env.GEOCODER_API_KEY,
  formatter: null
};

var geocoder = NodeGeocoder(options);

var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})


cloudinary.config({
  cloud_name: 'introverted27',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});


//INDEX - show all campgrounds
router.get("/", function(req, res) {
  var perPage = 8;
  var pageQuery = parseInt(req.query.page);
  var pageNumber = pageQuery ? pageQuery : 1;
  var noMatch = null;

  if(req.query.search) {
    const regex = new RegExp(escapeRegex(req.query.search), 'gi');
    Campground.find({name: regex}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allCampgrounds) {
      Campground.count({name: regex}).exec(function (err, count) {
        if (err) {
          console.log(err);
          res.redirect("back");
        } else {
          if(allCampgrounds.length < 1) {
            noMatch = "No campgrounds match that query, please try again.";
          }
          res.render("campgrounds/index", {
            campgrounds: allCampgrounds,
            current: pageNumber,
            pages: Math.ceil(count / perPage),
            noMatch: noMatch,
            search: req.query.search
          });
        }
      });
    });
  } else{
    Campground.find({}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, camps) {
      Campground.count().exec(function (err, count) {
        if (err) {
          console.log(err);
        } else {
          res.render("campgrounds/index", {
            campgrounds:camps,
            current: pageNumber,
            pages: Math.ceil(count / perPage),
            noMatch: noMatch,
            search: null
          });
        }
      });
    });
  }
});


//CREATE - add new campground to DB
router.post("/", middleware.isLoggedIn, upload.single('image'), function(req, res){
  geocoder.geocode(req.body.location, function (err, data) {
    if (err || !data.length) {
      req.flash('error', 'Invalid address');
      return res.redirect('back');
    } else {
      req.body.campground.lat = data[0].latitude;
      req.body.campground.lng = data[0].longitude;
      req.body.campground.location = data[0].formattedAddress;
      cloudinary.uploader.upload(req.file.path, function(result) {
        // add cloudinary url for the image to the campground object under image property
        req.body.campground.image = result.secure_url;
        // add image's public_id to campground object
        req.body.campground.imageId = result.public_id;
        // add author to campground
        req.body.campground.author = {
          id: req.user._id,
          username: req.user.username
        }
        Campground.create(req.body.campground, function(err, campground){
          if(err){
            req.flash('error', err.message);
            res.redirect('back');
          } else {
            //redirect back to campgrounds page
            res.redirect("/campgrounds/"+ campground.id);
          }
        });
      });
    }
  });
});


//NEW - show form to create new campground
router.get("/new", middleware.isLoggedIn, function(req, res){
   res.render("campgrounds/new");
});

//SHOW - shows more info about one campground
router.get("/:id", function(req, res){
  Campground.findById(req.params.id).populate("comments").exec(function(err, foundCampground){
    if (err || !foundCampground) {
      req.flash("error", "Campground not found");
      res.redirect("/campgrounds");
    } else {
      res.render("campgrounds/show", {campground:foundCampground});
    }
  });
});

// EDIT CAMPGROUND ROUTE
router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req, res){
  Campground.findById(req.params.id, function(err, foundCampground){
    res.render("campgrounds/edit", {campground: foundCampground});
  });
});

// UPDATE CAMPGROUND ROUTE
router.put("/:id", upload.single('image'), middleware.checkCampgroundOwnership, function(req, res){
  Campground.findById(req.params.id, async function(err, campground){
    if(err){
      req.flash("error", err.message);
      res.redirect("back");
    } else {
      campground.name = req.body.campground.name;
      campground.description = req.body.campground.description;
      campground.price = req.body.campground.price;
      if (req.file) {
        try {
          await cloudinary.v2.uploader.destroy(campground.imageId);
          var result = await cloudinary.v2.uploader.upload(req.file.path);
          campground.imageId = result.public_id;
          campground.image = result.secure_url;
        } catch(err) {
          req.flash("error", err.message);
          return res.redirect("back");
        }
      }
      geocoder.geocode(req.body.location, function (err, data) {
        if (err || !data.length) {
          console.log(err);
          req.flash('error', 'Invalid address');
          return res.redirect('back');
        }
        campground.lat = data[0].latitude;
        campground.lng = data[0].longitude;
        campground.location = data[0].formattedAddress;
        campground.save();
        req.flash("success","Successfully Updated!");
        res.redirect("/campgrounds/" + campground._id);
      });
      }
  });
});

// DESTROY CAMPGROUND ROUTE
router.delete('/:id', middleware.deleteComments, function(req, res) {
  console.log(typeof req.params.id);
  Campground.findById(req.params.id, async function(err, campground) {
    if(err) {
      req.flash("error", err.message);
      return res.redirect("back");
    }
    try {
      await cloudinary.v2.uploader.destroy(campground.imageId);
      campground.remove();
      req.flash('success', 'Campground deleted successfully!');
      res.redirect('/campgrounds');
    } catch(err) {
      req.flash("error", err.message);
      return res.redirect("back");
    }
  });
});

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;
