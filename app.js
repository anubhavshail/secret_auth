require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
//const encrypt = require("mongoose-encryption");
//const md5 = require("md5");
//const bcrypt = require("bcrypt");
//const saltrounds = 10;
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const session = require("express-session");
const LocalStrategy = require('passport-local').Strategy;
const cookieParser = require("cookie-parser");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(express.static("public"));
app.use(session({
    secret: "I am Don.",
    resave: true,
    saveUninitialized: true,
    cookie: {secure: true}
}))
app.use(passport.initialize());
app.use(passport.session());

const loginschema = new mongoose.Schema({
    username: String,
    password: String,
    googleId: String,
    secret: String

})

loginschema.plugin(passportLocalMongoose);
loginschema.plugin(findOrCreate);
//const secret = process.env.SECRET;

//loginschema.plugin(encrypt, {secret: secret, encryptedFields: ["password"]});

const User = mongoose.model("User", loginschema);

passport.use(new LocalStrategy(User.authenticate()));
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
passport.serializeUser(function(user, done) {
    done(null, user);
  });
  
  passport.deserializeUser(function(user, done) {
    done(null, user);
  });

mongoose.connect("mongodb://127.0.0.1:27017/secretdb");

app.get("/", (req, res)=>{
    res.render("home");
})

app.get("/register", (req, res)=>{
    res.render("register");
})

app.get("/login", (req, res)=>{
    res.render("login");
})

app.post("/register", (req, res)=>{
    
    // bcrypt.hash(req.body.password, saltrounds).then((hash)=>{
    //     const user = new User({
    //         username: req.body.username,
    //         password: hash
    //     })
    //     user.save().then(()=>{
    //     res.render("secrets");
    //     })
    //     .catch((err)=>{
    //         res.send(err);
    //     });
    // });

    User.register(new User({ username : req.body.username }), req.body.password, function(err, account) {
        if (err) {
            return res.render("register", { account : account });
        }

        passport.authenticate("local")(req, res, function() {
            res.redirect("/secrets");
        });
    });
    
});

//app.post("/login", (req, res)=>{
    //const email = req.body.username;
    //const password = req.body.password;

    //User.findOne({username: email}).then((user)=>{
        // bcrypt.compare(password, user.password).then((result)=>{
        //     if(result == true){
        //         res.render("secrets");
        //     }
        //     else{
        //         res.send("Incorrect password");
        //     }
        // })
    //})
    //.catch((err)=>{
    //    res.send(err);
    //});
//});


// app.post('/login', passport.authenticate("local"), function(req, res) {
//     const user = new User({
//         username: req.body.username,
//         password: req.body.password
//     })
//     res.redirect('/secrets');
// });

app.post("/login", function (req, res) {
    const user = new User({
        username: req.body.username,
        password:req.body.password
    });
    req.login(user,function(err){
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            });
        }
    })
});


app.get("/secrets",function(req,res){
    User.find({"secret":{$ne:null}})
    .then(function (foundUsers) {
      res.render("secrets",{usersWithSecrets:foundUsers});
      })
    .catch(function (err) {
      console.log(err);
      })
});
 
app.get("/submit", passport.authenticate("local"), function (req, res) {
        res.render("submit");
});
 
app.post("/submit", function (req, res) {
    console.log(req.user);
    User.findById(req.user)
      .then(foundUser => {
        if (foundUser) {
          foundUser.secret = req.body.secret;
          return foundUser.save();
        }
        return null;
      })
      .then(() => {
        res.redirect("/secrets");
      })
      .catch(err => {
        console.log(err);
      });
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets', passport.authenticate('google', { failureRedirect: '/login' }), function(req, res) {
    res.redirect('/secrets');
  });

app.get("/logout", function(req, res, next) {
    req.logout(function(err){
        if(err){return next(err);}
        res.redirect("/login");
    })
});


app.listen(3000, ()=>{
    console.log("server is running on port 3000");
})
