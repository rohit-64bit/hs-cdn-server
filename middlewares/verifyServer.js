const verifyServer = (req, res, next) => {

    try {

        const serverAccessToken = req.header('server-access-token') === process.env.SERVER_ACCESS_CODE;

        if (!serverAccessToken) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        next();

    } catch (error) {

        console.error(error.message);
        res.status(500).json({ error: "Unable to connect to cdn" })

    }

}

module.exports = verifyServer;