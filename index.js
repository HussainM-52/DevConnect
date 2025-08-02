// Import Statements
import express from "express";
import env from "dotenv";
import passport from 'passport';
import session from 'express-session';
import bodyParser from "body-parser";
import Routes from "./routes/routes.js";
import {error404Page} from "./controllers/error404.js";

//Setup
const app = express();
env.config();
const port = process.env.SERVER_PORT;

//Middleware Setup
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true, limit: '100mb' }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

// All Routes
app.use(Routes);
app.use("/", error404Page);

// Server Listening
app.listen(port, () => {
  console.log(`Server running on port: ${parseInt(port)}`);
});