let express = require('express');
let app = express();
let bodyParser = require('body-parser');
let mongoose = require('mongoose');
let cors = require('cors')
const morgan = require("morgan");
const passportConfig = require("./passport");
const passport = require("passport");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const path = require('path');
const dotenv = require("dotenv");
const { sequelize, User, Post, Report, Like, Image, Comment } = require("./models");
const axios = require("axios");

dotenv.config();
passportConfig();

const port = process.env.PORT || 3001;
const origin = process.env.ORIGIN || 'https://todo-list-pi-wine.vercel.app';

console.log(origin)

app.use(morgan("dev"));
app.use(cors({
  origin:origin,
  credentials:true,
}))

sequelize.sync()
  .then(() => {
    console.log('Database & tables created!');
  });

app.use('/uploads', express.static('uploads'));
app.use('/',express.static(path.join(__dirname, 'uploads')));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(
  session({
    saveUninitialized: false,
    resave: false,
    secret: process.env.COOKIE_SECRET,
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(passport.initialize());

const routerUser = require('./routes/user')(app, User);
const routerPost = require('./routes/post')(app, User, Image, Post,Like,Report);
const routerTest = require('./routes/test')(app, User, Image, Post,Like,Report);


let server = app.listen(port, function () {
  console.log("Express server has started on port " + port)
});

