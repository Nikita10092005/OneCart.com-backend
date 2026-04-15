// const jwt = require("jsonwebtoken");

// const adminOnly = (req,res,next)=>{

// try{

// let tokenHeader = req.headers.authorization;

// if(!tokenHeader){
// return res.status(401).json({message:"No token"});
// }

// let token = tokenHeader;
// if(tokenHeader.startsWith("Bearer ")){
//   token = tokenHeader.split(" ")[1];
// }

// const decoded = jwt.verify(token,process.env.JWT_SECRET);

// if(decoded.role !== "admin"){
// return res.status(403).json({message:"Admin access only"});
// }

// req.user = decoded;

// next();

// }catch(error){

// res.status(401).json({message:"Unauthorized"});

// }

// };

// module.exports = adminOnly;

const jwt = require("jsonwebtoken");

const adminOnly = (req, res, next) => {
  try {
    let tokenHeader = req.headers.authorization;

    if (!tokenHeader) {
      return res.status(401).json({ message: "No token" });
    }

    let token = tokenHeader.startsWith("Bearer ")
      ? tokenHeader.split(" ")[1]
      : tokenHeader;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    req.user = decoded;
    next();

  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
  }
};

module.exports = adminOnly;