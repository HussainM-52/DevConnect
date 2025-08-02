// Import Statemnets
import { transporter } from '../middleware/nodemailer.js';
import db from '../db/db.js';
import passport from "passport";
import env from "dotenv";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import bcrypt from "bcrypt";
env.config();
db.connect();

// Variable Decleration
const saltRounds = 10;
let email;

// Landing Page and Auth Routes
export const getIndexPage = async (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect("/home");
  } else {
    res.render("index.ejs", {
    title: "DevConnect",
  });
  }
}

export const handleImageUpload = (req, res) => {
  let imagePath = "/assets/default.png";
  if (!req.file) {
    res.json({ success: true, imagePath });
  } else {
    imagePath = `/uploads/${req.file.filename}`;
    res.json({ success: true, imagePath });
  }
};

export const downloadBlogAsHTML = async (req, res) => {
  const postId = req.params.id;

  const result = await db.query("SELECT * FROM posts WHERE id = $1", [postId]);
  if (result.rows.length === 0) {
    return res.status(404).send('Post not found');
  }

  const post = result.rows[0];
  const safeTitle = post.title.replace(/\s+/g, "_").replace(/[^\w\-]/g, "");
  const filename = `${safeTitle}.html`;

  // Compose HTML content
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/bootstrap-icons.min.css">
      <link href="https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.snow.css" rel="stylesheet" />
      <title>${post.title}</title>
      <style>
      body {
      padding: 0;
      margin: 0;
      background-color: #d8d8daff;
      display: flex;
      align-items: center;
      justify-content: center;
      }
      .ql-editor img {
        display: block;
        margin: 1rem auto;
        max-width: 80%;
        object-fit: cover;
        height: auto;
        border-radius: 5px;
      }
      .ql-editor * {
        background-color: whitesmoke !important;
        color: #212529 !important;
      }
      .post-title {
        color: #3e74e7 !important;
        text-align: center;
        text-transform: capitalize;
        text-shadow: 1px 1px rgba(0, 0, 0, 0.2);
        position: relative;
      }
      .post-title::after {
        content: '';
        position: absolute;
        left: 0;
        bottom: -16px;
        width: 100%;
        background-color: black;
        height: 5px;
        border-radius: 5px
      }
        body > .container {
        width: 90vw;
        margin: 30px 10px;
        border-radius: 10px;
        background-color: whitesmoke;
        padding: 0 20px 20px 20px;
        box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.2);
        }
      </style>
    </head>
    <body>
    <div class="container" style="">
    <div class="ql-editor">
      ${post.content}
      </div>
      </div>
      <script src="https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.js"></script>
    </body>
    </html>
  `;

  res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'text/html');
  res.send(htmlContent);
};

export const getEmailConfirmation = (req, res) => {
  const sessionData = req.session.emailVerification;
  if (!sessionData) {
    return res.redirect("/signup");
  }
  const message = req.session.message;
  req.session.message = null;
  res.render("confirmEmail.ejs", {
    title: "Email Confirmation",
    message: message,
  });
}

export const postEmailCofirmation = async (req, res) => {
  const userCode = req.body.code;
  const sessionData = req.session.emailVerification;
  if (!sessionData) {
    return res.redirect("/signup");
  }
  if (Date.now() > sessionData.expiresAt) {
    delete req.session.emailVerification;
    req.session.message = "Session Expired";
    return res.redirect("/signup");
  }
  if (userCode !== sessionData.code) {
    req.session.message = "Invalid Code";
    return res.redirect("/email-confirmation");
  }
  const password = sessionData.password;
  bcrypt.hash(password, saltRounds, async (err, hash) => {
    if (err) {
      console.error(`Error hashing password: ${err}`);
    }
    else {
      const result = await db.query("INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *", [sessionData.email.toLowerCase(), hash]);
      const user = result.rows[0];
      email = sessionData.email;
      delete req.session.emailVerification;
      req.logIn(user, (err) => {
        res.redirect("/create-profile");
      });
    }
  })
}

export const getLoginEmailVerification = (req, res) => {
  const sessionData = req.session.emailVerification;
  if (!sessionData) {
    return res.redirect("/login");
  }
  const message = req.session.message;
  req.session.message = null;
  res.render("verifyEmail.ejs", {
    title: "Email Verification",
    message: message,
  });
}

export const getChangePassword = (req, res) => {
  if (!email) {
    return res.redirect("/login");
  }
  res.render("changePassword.ejs", {
    title: "Change Password"
  });
}

export const postChangePassword = (req, res) => {
  const password = req.body.password;
  try {
    bcrypt.hash(password, saltRounds, async (err, hash) => {
      if (err) {
        return console.log(err);
      }
      const result = await db.query("UPDATE users SET password = $1 WHERE email = $2 RETURNING *", [hash, email]);
      email = null;
      res.redirect("/login");
    });
  } catch (err) {
    console.log(err);
  }
}

export const postLoginEmailVerification = async (req, res) => {
const userCode = req.body.code;
  const sessionData = req.session.emailVerification;
  if (!sessionData) {
    return res.redirect("/login");
  }
  if (Date.now() > sessionData.expiresAt) {
    delete req.session.emailVerification;
    req.session.message = "Session Expired";
    return res.redirect("/login");
  }
  if (userCode !== sessionData.code) {
    req.session.message = "Invalid code";
    return res.redirect("/login-email-verification");
  }
  res.redirect("/change-password");
  delete req.session.emailVerification;
}

export const getSignupForm = async (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect("/home");
  }
  const message = req.session.message;
  req.session.message = null;
  const result = await db.query("SELECT email FROM users");
  const emails = result.rows.map(row => row.email);
  res.render("signup.ejs", {
    title: "Signup",
    message: message,
    emails: emails,
  });
}

export const postSignupForm = async (req, res) => {
  const email = req.body.email;
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (checkResult.rows.length > 0) {
      req.session.message = 'Email already exists! try logging in';
      res.redirect("/login");
  }
  else {
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  const password = req.body.password;
  req.session.emailVerification = {
    code,
    email,
    password,
    expiresAt: Date.now() + 5 * 60 * 1000,
  };
    const info = await transporter.sendMail({
    from: '"DevConnect" <hus.mustan@gmail.com>',
    to: email,
    subject: 'DevConnect: Confirm Email',
    text: 'Hello! This is DevConnect.',
    html: `<b>Hello there!</b><br>This is your code <b>${code}</b><br><i>DevConnect</i>.`,
  });
  req.session.message = "Enter the 4 digit code sent to you email!";
  res.redirect("/email-confirmation");
}
}

export const getCreateProfile = async (req, res) => {
  if (req.isAuthenticated()) {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [req.user.email]);
    if (req.query.edit) {
    return res.render("createProfile.ejs", {
      profile: result.rows[0],
      title: 'Edit Profile',
      edit: true,
    })
  }
    const user = await db.query("SELECT * FROM users WHERE email = $1", [req.user.email]);
    if (user.rows[0].name) {
      return res.redirect("/home");
    } else {
      return res.render("createProfile.ejs", {
        title: "Create Profile",
      });
    }
  }
  res.redirect("/signup");
}

export const postCreateProfile = async (req, res) => {
  const body = req.body;
  try {
    const result = await db.query("UPDATE users SET name = $1, bio = $2, pfp = $3, username = $4 WHERE email = $5 RETURNING *", [body.name, body.bio || `Hey there! My name is ${body.name}.`, body.imagePath, body.username, email]);
    email = null;
    res.redirect("/home");
  } catch (err) {
    console.log(err);
  }
}

export const getEditProfileCancel = (req, res) => {
  res.redirect("/home/profile");
}

export const postEditProfile = async (req, res) => {
  const result = await db.query("UPDATE users SET name = $1, pfp = $2, bio = $3, username = $4 WHERE id = $5 RETURNING *", [
    req.body.name,
    req.body.imagePath,
    req.body.bio,
    req.body.username,
    req.body.id
  ]);
  res.redirect("/home/profile");
}

export const getLoginForm = (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect("/home");
  }
  const message = req.session.message;
  req.session.message = null;
  res.render("login.ejs", {
    title: "Login",
    message: message,
  });
}

export const getEmailTaking = (req, res) => {
  res.render("emailTaking.ejs", {
    title: "Email",
  });
}

export const postEmailTaking = async (req, res) => {
  const formEmail = req.body.email;
  const result = await db.query("SELECT * FROM users WHERE email = $1", [formEmail]);
  if (result.rows[0]) {
    if (result.rows[0].password === null) {
      req.session.message = "this email is verified through google, try logging in using google";
      return res.redirect("/login");
    }
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    req.session.emailVerification = {
      code,
      formEmail,
      expiresAt: Date.now() + 5 * 60 * 1000,
    };
      const info = await transporter.sendMail({
      from: '"DevConnect" <hus.mustan@gmail.com>',
      to: formEmail,
      subject: 'DevConnect: Verify Email',
      text: 'Hello! This is DevConnect.',
      html: `<b>Hello there!</b><br>This is your code <b>${code}</b><br><i>DevConnect</i>.`,
    });
    email = formEmail;
    req.session.message = "Enter the 4 digit code sent to you email!";
    res.redirect("/login-email-verification");
  } else {
    req.session.message = "this email is not signed in, sign up first";
    res.redirect("/signup");
  }
}

export const loginAuthentication = (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      if (req.session.message === "User not found. Please sign up first.") {
        return res.redirect("/signup");
      } else {
        return res.redirect("/login");
      }
    }
    req.logIn(user, err => {
      if (err) return next(err);
      return res.redirect("/home");
    });
  })(req, res, next);
};

export const googleAuth = passport.authenticate("google", {
    scope: ["profile", "email"],
  });

export const getGoogleAuthHome = passport.authenticate("google", {
  failureRedirect: "/login"
});

export const logout = (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
}

export const googleAuthHome = (req, res) => {
  if (req.user) {
    let redirectUrl;
    if (req.user.name === null) {
      email = req.user.email;
      redirectUrl = "/create-profile";
    } else {
      redirectUrl = "/home";
    }
    return res.redirect(redirectUrl);
  } else {
    return res.redirect("/login");
  }
};


// Home Routes
let data;

export const getHomePage = async (req, res) => {
  if (req.isAuthenticated()) {
    const user = await db.query("SELECT * FROM users WHERE email = $1", [req.user.email]);
    data =  user.rows[0];
    res.render("home.ejs", {
      title: "DevConnect",
      profile: data,
      isAuthenticated: true,
    });
    data = null;
  } else {
    res.redirect("/login");
  }
}

export const homeProfile = async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }
  const user = await db.query("SELECT * FROM users WHERE email = $1", [req.user.email]);
  const profile = user.rows[0];
  const userId = req.user.id;
  const query = `
    SELECT 
  posts.*, 
  COALESCE(JSON_AGG(DISTINCT tags.tag) FILTER (WHERE tags.id IS NOT NULL), '[]') AS tags,
  COALESCE(JSON_AGG(DISTINCT likes) FILTER (WHERE likes.id IS NOT NULL), '[]') AS likes,
  COALESCE(JSON_AGG(DISTINCT comments) FILTER (WHERE comments.id IS NOT NULL), '[]') AS comments,
  users.id AS user_id,
  users.username AS username
  FROM posts
  LEFT JOIN tags ON posts.id = tags.post_id
  INNER JOIN users ON users.id = posts.user_id
  LEFT JOIN likes ON posts.id = likes.post_id
  LEFT JOIN comments ON posts.id = comments.post_id
  WHERE posts.user_id = $1
  GROUP BY posts.id, users.id
  ORDER BY posts.id DESC;
  `;
  const params = [userId];
  const result = await db.query(query, params);
  const posts = result.rows;
  res.render("profile.ejs", {
    title: "profile",
    profile: profile,
    isAuthenticated: true,
    posts: posts,
  })
}

export const homePostCreate = async (req, res) => {
  if (req.isAuthenticated()) {
    const user = req.user;
    const id = req.query.id;
    let posts = null;
    let isNew = true;
    const result = await db.query("SELECT * FROM users WHERE email = $1", [user.email]);
    if (req.query.edit) {
      const postResult = await db.query(`
        SELECT posts.*, 
        COALESCE(JSON_AGG(tags.tag) FILTER (WHERE tags.id IS NOT NULL), '[]') AS tags
        FROM posts
        LEFT JOIN tags ON posts.id = tags.post_id
        WHERE posts.id = $1
        GROUP BY posts.id
        `, [id]);
      posts = postResult.rows[0];
      await db.query("DELETE FROM tags WHERE post_id = $1", [posts.id]);
      isNew = false;
    }
    res.render("postCreate.ejs", {
      title: 'Create Post',
      isAuthenticated: true,
      profile: result.rows[0],
      post: posts,
      isNew: isNew,
    });
  }
  else {
    res.redirect("/login");
  }
}

export const postHomePostCreate = async (req, res) => {
  const body = req.body;
  const content = `<h1 class='post-title'>${body.title}</h1><br><br><br>` + body.content;
  if (body.action === 'draft') {
    const postResult = await db.query("INSERT INTO posts (user_id, content, published, description, title, only_content) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *", [body.user_id, content, false, body.description, body.title, body.content]);
    const postId = await postResult.rows[0].id;
    const tags = body.tags;
    const tagArray = tags.split(",");
    const tagResult = tagArray.forEach(async(tag) => {
       await db.query("INSERT INTO tags (post_id, tag) VALUES ($1, $2) RETURNING *", [postId, tag]);
    });
    res.redirect("/home/my-posts");
  }
  else if (body.action === 'publish') {
    const postResult = await db.query("INSERT INTO posts (user_id, content, published, description, createdat, title, only_content) VALUES ($1, $2, $3, $4, $5, $6, &7) RETURNING *", [body.user_id, content, true, body.description, Date.now(), body.title, body.content]);
    const postId = await postResult.rows[0].id;
    const tags = body.tags;
    const tagArray = tags.split(",");
    const tagResult = tagArray.forEach(async(tag) => {
       await db.query("INSERT INTO tags (post_id, tag, createdat) VALUES ($1, $2, $3) RETURNING *", [postId, tag, Date.now()]);
    });
    res.redirect("/home/my-posts");
  }
}

export const postEditPost = async (req, res) => {
  const body = req.body;
  const content = `<h1 class='post-title'>${body.title}</h1><br><br><br>` + body.content;
  if (body.action === 'draft') {
    const params = [body.title, body.description, body.content, content, body.post_id];
    const postResult = await db.query(`
      UPDATE posts
      SET title = $1,
      description = $2,
      only_content = $3,
      content = $4
      WHERE id = $5
      RETURNING *
      `, params);
    const tags = body.tags;
    const tagArray = tags.split(",");
    const tagResult = tagArray.forEach(async(tag) => {
       await db.query("INSERT INTO tags (post_id, tag) VALUES ($1, $2) RETURNING *", [body.post_id, tag]);
    });
    res.redirect("/home/my-posts");
  }
  else if (body.action === 'publish') {
    const params = [content, true, body.description, Date.now(), body.title, body.content, body.post_id];
    const postResult = await db.query(`
      UPDATE posts
      SET content = $1,
      published = $2,
      description = $3,
      updatedat = $4,
      title = $5,
      only_content = $6
      WHERE id = $7
      RETURNING *`, params);
    const postId = await postResult.rows[0].id;
    const tags = body.tags;
    const tagArray = tags.split(",");
    const tagResult = tagArray.forEach(async(tag) => {
       await db.query("INSERT INTO tags (post_id, tag, createdat) VALUES ($1, $2, $3) RETURNING *", [body.post_id, tag, Date.now()]);
    });
    res.redirect("/home/my-posts");
  }
}

export const getPostDelete = async (req, res) => {
  if (req.isAuthenticated()) {
    const id = req.params.id;
    const result = await db.query("DELETE FROM posts where id=$1", [id]);
    console.log(result.rows[0]);
    res.redirect("/home/my-posts");
  } else {
    res.redirect("/login")
  }
}

export const cancelPostBtn = (req, res) => {
  res.redirect("/home");
}

export const publishPost = async (req, res) => {
  if (req.isAuthenticated()) {
    const post_id = req.params.id;
    const result = await db.query(`
      UPDATE posts
      SET published = $1,
      createdat = $2
      WHERE id = $3
      RETURNING *  
    `, [true, Date.now(), post_id]);
    res.redirect("/home/profile");
  }
  else {
    res.redirect("/login");
  }
}

export const getBlogView = async (req, res) => {
  if (req.isAuthenticated()) {
    const id = req.params.id;
    const user = await db.query("SELECT * FROM users WHERE email = $1", [req.user.email]);
    const profile = user.rows[0];
    const result = await db.query(`
      SELECT * FROM posts WHERE id = $1
    `, [id]);
    const post = result.rows[0];
    res.render("blogView.ejs", {
      title: post.title,
      isAuthenticated: true,
      profile: profile,
      post: post,
    });
  }
  else {
    res.redirect("/login");
  }
}

export const getMyPosts = async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }
  const user = await db.query("SELECT * FROM users WHERE email = $1", [req.user.email]);
  const profile = user.rows[0];
  const userId = req.user.id;
  const query = `
    SELECT 
  posts.*, 
  COALESCE(JSON_AGG(DISTINCT tags.tag) FILTER (WHERE tags.id IS NOT NULL), '[]') AS tags,
  COALESCE(JSON_AGG(DISTINCT likes) FILTER (WHERE likes.id IS NOT NULL), '[]') AS likes,
  COALESCE(JSON_AGG(DISTINCT comments) FILTER (WHERE comments.id IS NOT NULL), '[]') AS comments,
  users.id AS user_id,
  users.username AS username
  FROM posts
  LEFT JOIN tags ON posts.id = tags.post_id
  INNER JOIN users ON users.id = posts.user_id
  LEFT JOIN likes ON posts.id = likes.post_id
  LEFT JOIN comments ON posts.id = comments.post_id
  WHERE posts.user_id = $1
  GROUP BY posts.id, users.id
  ORDER BY posts.id DESC;
  `;
  const params = [userId];
  const result = await db.query(query, params);
  const posts = result.rows;
  res.render("myPosts.ejs", {
    title: "My Posts",
    profile: profile,
    isAuthenticated: true,
    posts: posts,
  })
}


// Strategies
passport.use(
  "local",
  new Strategy(
    { usernameField: "username", passReqToCallback: true },
    async function verify(req, username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        if (!storedHashedPassword) {
          req.session.message = "This email is verified through google, try logging in with google";
          return cb(null, false);
        }
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              return cb(null, user);
            } else {
              req.session.message = "Incorrect Password!"
              return cb(null, false);
            }
          }
        });
      } else {
        req.session.message = 'User not found. Please sign up first.';
        return cb(null, false);
      }
    } catch (err) {
      console.log(err);
    }
  })
);

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/home",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          profile.email,
        ]);
        if (result.rows.length === 0) {
          const newUser = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [profile.email, null]
          );
          return cb(null, newUser.rows[0]);
        } else {
          return cb(null, result.rows[0]);
        }
      } catch (err) {
        console.log("error: ", err);
        return cb(err);
      }
    }
  )
);
passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});