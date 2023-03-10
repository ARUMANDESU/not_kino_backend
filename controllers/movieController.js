const Movie = require("../models/movie");
const { Validator } = require("node-input-validator");
const axios = require("axios");
class movieController {
    async createMovieHandler(req, res, next) {
        try {
            const v = new Validator(req.body, {
                title: "required|string",
                description: "required|string",
                rate: "required|integer",
                country: "required|string",
                length: "required|integer",
                actors: "required|array",
                "actors.*.name": "required|string",
                "actors.*.img_url": "required|string",
                "actors.*.url": "required|string",
                comments: "array",
                "comments.*.date": "required|string",
                "comments.*.user_id": "required|string",
                "comments.*.text": "required|string",
            });

            v.check().then(async (matched) => {
                if (!matched) {
                    res.status(422).json(v.errors);
                    return;
                }

                await Movie.create(v.inputs)
                    .then((movie) => {
                        res.json(movie);
                    })
                    .catch((e) => {
                        console.log(e);
                    });
            });
        } catch (e) {
            console.log(e);
            res.status(400).json({ successful: false, message: "Error" });
        }
    }
    async getMovieHandler(req, res, next) {
        try {
            const movie_id = req.params.id;
            await Movie.findOne({ _id: movie_id })
                .then((movie) => {
                    res.json(movie);
                })
                .catch((e) => {
                    console.log(e);
                });
        } catch (e) {
            next(e);
        }
    }

    async updateMovieHandler(req, res, next) {
        try {
            const movie_id = req.params.id;

            await Movie.updateOne({ _id: movie_id }, { $set: req.body })
                .then((movie) => {
                    res.json({ successful: true });
                })
                .catch((e) => {
                    res.status(400);
                });
        } catch (e) {
            next(e);
        }
    }
    async deleteMovieHandler(req, res, next) {
        try {
            const movie_id = req.params.id;
            await Movie.findOneAndDelete({ _id: movie_id })
                .then((movie) => {
                    res.json({ successful: true });
                })
                .catch((e) => {
                    res.status(400);
                });
        } catch (e) {
            next(e);
        }
    }

    async listMovieHandler(req, res, next) {
        try {
            let limit = req.query.limit || 10;
            delete req.query.limit;

            if (req.query.rate) {
                req.query.rate = req.query.rate.split("-");
                req.query.$and = [
                    { "rate.kp": { $gte: req.query.rate[0] } },
                    { "rate.kp": { $lte: req.query.rate[1] } },
                ];
                delete req.query.rate;
            }

            await Movie.find(req.query)
                .limit(parseInt(limit))
                .then((movies) => {
                    res.json(
                        movies.sort(function (a, b) {
                            return b.rate.kp - a.rate.kp;
                        })
                    );
                })
                .catch((e) => {
                    next(e);
                });
        } catch (e) {
            next(e);
        }
    }

    async importFromKP(req, res, next) {
        try {
            const { rate, limit } = req.query;
            const url = `https://api.kinopoisk.dev/movie/?token=${process.env.KINOPOISK_API_TOKEN}&rate=${rate}&limit=${limit}`;
            axios.get(url).then(async (response) => {
                let movies = [];
                response.data.docs.map((data) => {
                    const acceptable =
                        data.name &&
                        data.description &&
                        data.year &&
                        data.movieLength &&
                        data.votes.kp &&
                        data.votes.imdb &&
                        data.rating &&
                        data.rating.imdb &&
                        data.rating.kp &&
                        data.poster &&
                        data.poster.url &&
                        data.poster.previewUrl;

                    if (acceptable) {
                        const temp = {
                            title: data.name,
                            description: data.description,
                            rate: data.rating,
                            year: data.year,
                            length: data.movieLength,
                            votes: data.votes,
                            poster: {
                                url: data.poster.url,
                                previewUrl: data.poster.previewUrl,
                            },
                            watchability: {
                                items: data.watchability.items,
                            },
                            type: data.type,
                        };

                        movies.push(temp);
                    }
                });

                await Movie.insertMany(movies);
                res.json(movies);
            });
        } catch (e) {
            next(e);
        }
    }

    async searchHandler(req, res, next) {
        try {
            const payload = req.body.payload.trim();
            const movies = await Movie.find({
                title: { $regex: new RegExp("^" + payload + ".*", "i") },
            }).limit(15);

            res.json(movies);
        } catch (e) {
            next(e);
        }
    }
}

module.exports = new movieController();
