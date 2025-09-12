var jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "abhedagarwal%male";

const fetchuser = (req, res, next) => {
    //Get the user from the jwt token and add id to req object
    const token = req.header("auth-token");
    if (!token) {
        res.status(401).send({
            error: "Please Uthenticate using a valid token",
        });
    }
    try {
        const data = jwt.verify(token, JWT_SECRET);
        req.doc = data.doc;
        next();
    } catch (error) {
        res.status(401).send({
            error: "Please Uthenticate using a valid token",
        });
    }
};
module.exports = fetchuser;
