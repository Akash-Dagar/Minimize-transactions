//jshint esversion:6
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose=require("mongoose");

const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy; 
const findOrCreate = require('mongoose-findorcreate');

//some of the above are taken from their respective websites



const app = express();



app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
 
app.use(session({
    secret: "dwfhwhfiewfbdhfwh",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://127.0.0.1/userDB");

 
const userSchema = new mongoose.Schema({
    name: String, // Add the 'name' field
    email: String,
    password: String,
    googleId: String
});


userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields:["password"]});

const User=new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
 
  passport.deserializeUser(function(id, done) {
    User.findById(id)
        .then(user => {
            done(null, user);
        })
        .catch(err => {
            done(err, null);
        });
});


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets", //taken from google auth website that we made app
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"

},
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile);
    const userGivenName = profile.name.givenName;
    
    
    User.findOrCreate({ googleId: profile.id },userGivenName, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/",function(req,res){
    res.render("home");
});
app.get("/auth/google",
    passport.authenticate("google",{scope:["profile"]})
);
app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

app.get("/login",function(req,res){
    res.render("login");
});

app.get("/register",function(req,res){
    res.render("register");
});
app.get("/secrets", function(req, res) {
    let userDisplayName = ''; // Initialize the display name variable

    if (req.isAuthenticated()) {
        if (req.user.googleId) {
            // If the user is logged in with Google, use their givenName
            userDisplayName = req.user.givenName || ''; // Use givenName if available, otherwise an empty string
        } else {
            // If the user is not logged in with Google, use their manually entered name
            userDisplayName = req.user.name || ''; // Use name if available, otherwise an empty string
        }

        // Render the view with userDisplayName
        console.log(req.user);
        res.render("secrets", { user: req.user, userDisplayName: userDisplayName });
    }
    else{
        res.redirect("/login");
    }
});
//In this modified code, userDisplayName is declared at the beginning of the route function, and then it's assigned the appropriate value based on the authentication method used. This ensures that userDisplayName is available within the scope of the /secrets route, and it will be correctly passed to the view.






app.get("/logout", function(req, res) {
    req.logout(function(err) {
        if (err) {
            console.log(err);
        }
        res.redirect("/");
    });
});



app.post("/register", function(req, res) {
    const newUser = new User({
        name: req.body.name, // Get the 'name' from the form
        username: req.body.username,
        
    });

    User.register(newUser, req.body.password, function(err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function() {
                res.redirect("/login");
            });
        }
    });
});


app.post("/login",function(req,res){
   const user=new User({
    username: req.body.username,
    password: req.body.password
   })
   req.login(user,function(err){
    if(err){
        console.log(err);
    }
    else{
        passport.authenticate("local")(req,res,function(){
            res.redirect("/secrets");
        }) ;
    }
   })
});

app.post("/page1",function(req,res){
    const num1=req.body.num1;
    res.render("page1",{user: req.user,num1});
    
    
});
app.post('/page2', (req, res) => {
    const submittedNames = [];
    const num1 = req.body.num1;
    

    // console.log('Form Data:', req.body); // Add this console.log
    // console.log(Object.keys(req.body).length);
    for (let i = 0; i < num1; i++) {
        const nameField = `name${i}`;
        const nameValue = req.body[nameField];
        submittedNames.push(nameValue);
    }
    req.session.submittedNames = submittedNames;
    // console.log('Submitted Names:', submittedNames);
    res.render('page2', {user: req.user, submittedNames,num1 });
    
});

app.post('/page3',(req,res)=>{
    const num1=req.body.num1;
    const num2=req.body.num2;
    
    res.render("page3",{user: req.user,num1,num2});
})
app.post('/page4', (req, res) => {
    const transactions = [];
    const num1_temp = req.body.num1;
    const num1=parseInt(num1_temp[0]);
    const submittedNames = req.session.submittedNames;
    
    for (let i = 0; i < num1; i++) {
        transactions.push(new Array(num1).fill(0));
    }
    const num2_temp = req.body.num2;
    const num2=parseInt(num2_temp[0]);
    console.log(num1);
    console.log(num2);
    for (let i = 0; i < num2; i++) {
        const borrower = req.body[`borrower${i}`];
        const lender = req.body[`lender${i}`];
        const amount = parseInt(req.body[`amount${i}`]);

        const borrowerIndex = submittedNames.indexOf(borrower);
        const lenderIndex = submittedNames.indexOf(lender);

        if (borrowerIndex !== -1 && lenderIndex !== -1) {
            transactions[borrowerIndex][lenderIndex] += amount;
        }
    }

    // Now 'transactions' contains the 2D matrix with borrowed amounts
    const optimizedTransactions = minCashFlow(transactions, num1);

    // You can pass 'transactions' to the page where you want to display it
    res.render('page4', {user: req.user,submittedNames,optimizedTransactions});
});





function solve(amount, ans) {
    let minIdx = 0;
    let maxIdx = 0;
    
    for (let i = 1; i < amount.length; i++) {
        if (amount[i] < amount[minIdx]) {
            minIdx = i;
        }
    }
    
    for (let i = 1; i < amount.length; i++) {
        if (amount[i] > amount[maxIdx]) {
            maxIdx = i;
        }
    }
    
    if (amount[minIdx] === 0 || amount[maxIdx] === 0) {
        return;
    }
    
    const give = Math.min(-amount[minIdx], amount[maxIdx]);
    amount[minIdx] += give;
    amount[maxIdx] -= give;
    
    ans[minIdx][maxIdx] = give;
    solve(amount, ans);
}

function minCashFlow(transactions, n) {
    const amount = new Array(n).fill(0);

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            amount[i] += transactions[j][i] - transactions[i][j];
        }
    }

    const ans = new Array(n).fill(0).map(() => new Array(n).fill(0));
    solve(amount, ans);
    return ans;
}

 
app.listen(3000, function() {
  console.log("Server started on port 3000");
});