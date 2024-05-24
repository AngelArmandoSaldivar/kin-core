const express = require('express');
const BodyParser = require("body-parser");
const cors = require('cors');
const { response } = require('express');
const app = express()
app.use(BodyParser.json());
app.use(BodyParser.urlencoded({ extended: true }));


//app.use(cors());

app.listen(3001, () => {
    console.log("SUCCESS");
});

app.get("/kin/api/v1/echoMessage", (request, response) => {
    response.send("Hola mundo");
});