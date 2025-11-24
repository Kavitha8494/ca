const express = require('express');
const cors = require('cors')
const referrerPolicy = require('referrer-policy')
const socketIO = require('socket.io');
const http = require('http');
const Net = require('net');
const nodeCron = require("node-cron");

// create express app
const app = express();
const router = express.Router();

//.env setup
const dotenv = require('dotenv');
dotenv.config();

const bodyParser = require('body-parser');     //url-encoded
const bcrypt = require('bcryptjs');        //Password Hashing
const jwt = require('jsonwebtoken');       //JSON Web Token
const cookieParser = require('cookie-parser'); //Cookie session
const session = require('express-session');    //Session
const flash = require('connect-flash');      //Flash




const port = process.env.PORT || 3001;       // Setup server port




app.use(bodyParser.urlencoded({ extended: true }));  // parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.json());               // parse requests of content-type - application/json

app.use(cors());

// Referrer-Policy: same-origin
app.use(referrerPolicy({ policy: 'same-origin' }));


app.use(flash());

// Session configuration
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

//setting all files view as .ejs
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use('/fa', express.static(__dirname + '/node_modules/@fortawesome/fontawesome-free'));


const nDate = new Date().toLocaleString('en-US', {
  timeZone: 'Asia/Calcutta'
});

// Routes
app.get("/", (req, res) => {
  res.render("index", { title: "My Home Page" });
});

app.get("/careers", (req, res) => {
  res.render("careers", { title: "Careers" });
});

app.get("/contact-us", (req, res) => {
  res.render("contact-us", { title: "Contact Us" });
});

app.get("/about-us", (req, res) => {
  res.render("about-us", { title: "About Us" });
});

// Admin routes
const adminRoutes = require('./routes/admin');
app.use('/admin', adminRoutes);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).send('Page not found');
})

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

