const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger.json");
const cookieParser = require("cookie-parser");

const router = require("./routers/router");
const {
    logErrors,
    clientErrorHandler,
    errorHandler,
} = require("./services/errors");

const app = express();
app.use(
    cors({
        origin: "*",
        credentials: true,
    })
);

const port = process.env.PORT || 4000;

dotenv.config();
mongoose.set("strictQuery", false);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded());
app.use(router);

app.use(logErrors);
app.use(clientErrorHandler);
app.use(errorHandler);

mongoose
    .connect(process.env.DB_URL)
    .then(() => console.log("Connected to DB!"))
    .catch((error) => console.log(error));
app.listen(port, () => console.log(`Server listening on port ${port}!`));
