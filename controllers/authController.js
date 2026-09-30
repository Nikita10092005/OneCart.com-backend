
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { addPoints } = require("./rewardsController");

/* ================= REGISTER ================= */

const registerUser = async (req,res)=>{

try{

const {name,password} = req.body;
const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
if (typeof name !== 'string' || !name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length < 6 || Buffer.byteLength(password) > 72) {
  return res.status(400).json({message:'Enter a name, valid email and a password of 6–72 bytes.'});
}

const userExists = await User.findOne({email});

if(userExists){
return res.status(400).json({message:"User already exists"});
}

const hashedPassword = await bcrypt.hash(password,10);

// Public signup must never grant administrator privileges.
const role = 'user';

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

const {password} = req.body;
const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
if (!email || typeof password !== 'string' || !password) return res.status(400).json({message:'Email and password are required'});

const user = await User.findOne({email});

if(!user){
return res.status(400).json({message:"Invalid email"});
}

if (['banned', 'suspended'].includes(user.accountStatus)) return res.status(403).json({message:'Account is banned/suspended'});
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

if (!payload?.email_verified || !payload.email) return res.status(401).json({message:'A verified Google email is required'});
const email = payload.email.toLowerCase();
const name = payload.name || email;

/* CHECK USER */
let user = await User.findOne({ email });

if (!user) {

  const role = 'user';
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

if (['banned', 'suspended'].includes(user.accountStatus)) return res.status(403).json({message:'Account is banned/suspended'});
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