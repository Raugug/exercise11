const port = process.env.PORT;

module.exports = (req, res, next) => {
    return Promise.resolve(res.status(200))
} 