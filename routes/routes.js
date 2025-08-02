// Import Statements
import * as Controllers from "../controllers/controller.js";
import { Router } from "express";
import { upload } from "../middleware/file-upload.js";

// Router Connection
const router = Router();

// Routes
router.get("/", Controllers.getIndexPage);
router.get("/signup", Controllers.getSignupForm);
router.get("/email-confirmation", Controllers.getEmailConfirmation);
router.get("/login-email-verification", Controllers.getLoginEmailVerification);
router.get("/login", Controllers.getLoginForm);
router.get("/email", Controllers.getEmailTaking);
router.get("/change-password", Controllers.getChangePassword);
router.get("/create-profile", Controllers.getCreateProfile);
router.get("/auth/google", Controllers.googleAuth);
router.get("/auth/google/home", Controllers.getGoogleAuthHome, Controllers.googleAuthHome);
router.get("/logout", Controllers.logout);
router.get("/home", Controllers.getHomePage);
router.get("/home/profile", Controllers.homeProfile);
router.get("/home/create-post", Controllers.homePostCreate);
router.get("/edit-profile-cancel", Controllers.getEditProfileCancel);
router.get("/home/cancel-post", Controllers.cancelPostBtn);
router.get("/home/post/:id/download", Controllers.downloadBlogAsHTML)
router.get("/home/post/:id", Controllers.getBlogView);
router.get("/home/publish-post/:id", Controllers.publishPost);
router.get("/home/my-posts", Controllers.getMyPosts);
router.get("/home/post-delete/:id", Controllers.getPostDelete);
router.post("/email", Controllers.postEmailTaking);
router.post("/signup", Controllers.postSignupForm);
router.post("/login-email-verification", Controllers.postLoginEmailVerification);
router.post("/email-confirmation", Controllers.postEmailCofirmation);
router.post("/login", Controllers.loginAuthentication);
router.post("/change-password", Controllers.postChangePassword);
router.post("/create-profile", Controllers.postCreateProfile);
router.post("/edit-profile", Controllers.postEditProfile);
router.post("/home/edit-post", Controllers.postEditPost);
router.post("/home/create-post", Controllers.postHomePostCreate);

//File upload route
router.post('/upload-image', upload.single('profileImage'), Controllers.handleImageUpload);

export default router;