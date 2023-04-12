const express = require("express");
const axios = require("axios");
const cors = require("cors");
const redis = require('redis');

const redisClient = redis.createClient({
    port: 6379,
    host: '127.0.0.1',
    legacyMode: true,
});

const default_expiration = 3600;

const app = express();
app.use(express.urlencoded({ extended: true }))
app.use(cors())
redisClient.connect()

app.get("/photos", async (req, res) => {

    const albumId = req.query.albumId;

    const photos = await getOrSetCache(`photos?albumId=${albumId}`, async () => {
        const { data } = await axios.get(
            "https://jsonplaceholder.typicode.com/photos",
            { params: { albumId } }
        )
        return data
    })

    res.json(photos)


})


app.get("/photos/:id", async (req, res) => {

    const photo = await getOrSetCache(`photos:${req.params.id}`, async () => {
        const { data } = await axios.get(
            `https://jsonplaceholder.typicode.com/photos/${req.params.id}`)
        return data
    })

    res.json(photo)
})


const getOrSetCache = (key, cb) => {
    return new Promise((resolve, reject) => {
        redisClient.get(key, async (err, data) => {
            if (err) return reject(err)
            if (data !== null) return resolve(JSON.parse(data))
            const freshData = await cb();
            redisClient.setEx(key, default_expiration, JSON.stringify(freshData))
            resolve(freshData)
        })
    })
}

redisClient.on("error", function (error) {
    console.error("Error encountered: ", error)
})

redisClient.on("connect", function (error) {
    console.error("Redis Connection Established")
})

app.listen(5000, () =>
    console.log(`Server started on ${5000}`)
);