// Single-process abuse protection; use a shared store when running multiple replicas.
module.exports = ({limit=30,windowMs=15*60*1000}={}) => {
  const clients=new Map();
  const timer=setInterval(()=>{const now=Date.now();for(const [key,value] of clients)if(value.expires<=now)clients.delete(key);},windowMs);
  timer.unref();
  return (req,res,next)=>{
    const key=req.ip,now=Date.now();
    let entry=clients.get(key);
    if (!entry || entry.expires<=now) {
      if(clients.size>=10000&&!clients.has(key))return res.status(503).json({message:'Please try again later'});
      entry={count:0,expires:now+windowMs};clients.set(key,entry);
    }
    entry.count++;
    if(entry.count>limit){res.set('Retry-After',String(Math.ceil((entry.expires-now)/1000)));return res.status(429).json({message:'Too many attempts. Please try again later.'});}
    next();
  };
};
