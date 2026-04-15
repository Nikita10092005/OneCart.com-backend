
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { addPoints } = require("./rewardsController");

/* ================= REGISTER ================= */

const registerUser = async (req,res)=>{

try{

const {name,email,password} = req.body;

const userExists = await User.findOne({email});

if(userExists){
return res.status(400).json({message:"User already exists"});
}

const hashedPassword = await bcrypt.hash(password,10);

/* ROLE LOGIC */
let role = "user";

if (process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL) {
  role = "admin";
} else {
  const adminCount = await User.countDocuments({ role: "admin" });
  if (adminCount === 0) {
    role = "admin";
  }
}

const user = await User.create({
  name,
  email,
  password: hashedPassword,
  role,
  isVerified: true   // 🔥 normal users auto verified (or change if using email verification)
});

// Add welcome points
try {
  await addPoints(user._id, 100, "registration", "Welcome bonus for joining!");
} catch (e) {
  console.error("Failed to add welcome points:", e.message);
}

const updatedUser = await User.findById(user._id).select("-password");

res.json({
  message:"Registration successful",
  user: updatedUser
});

}catch(error){
res.status(500).json({message:error.message});
}

};


/* ================= LOGIN ================= */

const loginUser = async (req,res)=>{

try{

const {email,password} = req.body;

const user = await User.findOne({email});

if(!user){
return res.status(400).json({message:"Invalid email"});
}

/* 🔥 HANDLE GOOGLE USER LOGIN */
if(user.password === "google-login"){
return res.status(400).json({
  message:"Please login with Google"
});
}

const match = await bcrypt.compare(password,user.password);

if(!match){
return res.status(400).json({message:"Invalid password"});
}

const token = jwt.sign(
{ id:user._id, role:user.role },
process.env.JWT_SECRET,
{ expiresIn:"7d" }
);

const safeUser = user.toObject();
delete safeUser.password;

res.json({
 token,
 user: safeUser
});

}catch(error){
res.status(500).json({message:error.message});
}

};


/* ================= GOOGLE LOGIN ================= */

const googleLogin = async (req, res) => {

try {

const { token } = req.body;

if (!token) {
  return res.status(400).json({ message: "Token missing" });
}

/* VERIFY GOOGLE TOKEN */
const ticket = await client.verifyIdToken({
  idToken: token,
  audience: process.env.GOOGLE_CLIENT_ID,
});

const payload = ticket.getPayload();

const { email, name } = payload;

/* CHECK USER */
let user = await User.findOne({ email });

if (!user) {

  let role = "user";

  if (process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL) {
    role = "admin";
  }

  user = await User.create({
    name,
    email,
    password: "google-login", // 🔥 special flag
    role,
    isVerified: true          // 🔥 auto verified
  });

  // Add welcome points for Google users
  try {
    await addPoints(user._id, 100, "registration", "Welcome bonus for joining!");
  } catch (e) {
    console.error("Failed to add welcome points:", e);
  }

}

/* GENERATE JWT */
const jwtToken = jwt.sign(
  { id: user._id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);

const safeUser = user.toObject();
delete safeUser.password;

res.json({
  token: jwtToken,
  user: safeUser
});

} catch (error) {

console.error("Google login error:", error);
res.status(500).json({ message: "Google login failed" });

}

};

module.exports = {
  registerUser,
  loginUser,
  googleLogin
};