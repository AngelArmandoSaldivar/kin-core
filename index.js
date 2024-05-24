const express = require('express');
const BodyParser = require("body-parser");
const cors = require('cors');
const { response } = require('express');
const app = express()
app.use(express.json());
app.use(express.urlencoded({extended: true}));
const PORT = process.env.PORT || 5000;


//app.use(cors());

app.get("/", (request, response) => {
    response.send("Hola mundo");
})

app.get("/kin/api/v1/echoMessage", (request, response) => {
    response.send("Message Test");
});

app.listen(PORT, () => {
    console.log(`Example app listening on port ${PORT}`)
});