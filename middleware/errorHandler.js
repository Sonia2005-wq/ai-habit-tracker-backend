export const notFound = (req, res, next) => {
    res.status(404).json({message: `Route not found: ${req.originalUrl}`});
};

export const errorHandler = (err, req, res, next) => {
    console.log(err); 
    const status = res.statusCode && res.statusCode !== 200 ? res.statusCode: 500;
     res.status(status).json({
        message: err.message || "Server error", 

    })
}