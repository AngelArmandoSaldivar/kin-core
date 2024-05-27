const express = require('express');
const BodyParser = require("body-parser");
const cors = require('cors');
const { response } = require('express');
const config = require('./config');
const app = express()
app.use(express.json());
app.use(express.urlencoded({extended: true}));

//app.use(cors());

app.get("/", (request, response) => {
    response.send("Hola mundo");
})

app.get("/kin/api/v1/echoMessage", (request, response) => {
    response.send("Message Test");
});

app.post('/coreBanking/AUTH', (request, response) => {

    const reqMessage = request.body;

    var bodyResponse = {
        messageId : '',
        validationResponse : ''
    }
   
    bodyResponse.messageId = reqMessage.messageId;
    bodyResponse.validationResponse = "OK";
    response.send(bodyResponse); 
});

app.post('/coreBanking/ADVICE', (request, response) => {    

    const reqMessage = request.body;

    var bodyResponse = {
        messageId : '',
        messageType : ''
    }
   
    bodyResponse.messageId = reqMessage.messageId;
    bodyResponse.messageType = reqMessage.messageType;
    response.send(bodyResponse); 
});

app.post('/coreBanking/REVERSAL', (request, response) => {    

    const reqMessage = request.body;

    var bodyResponse = {
        messageId : '',
        messageType : ''
    }
   
    bodyResponse.messageId = reqMessage.messageId;
    bodyResponse.messageType = reqMessage.messageType;
    response.send(bodyResponse);
});

app.post('/coreBanking/ECHO', (request, response) => {    

    const reqMessage = request.body;

    var bodyResponse = {
        messageId : '',
        messageType : ''
    }
   
    bodyResponse.messageId = reqMessage.messageId;
    bodyResponse.messageType = reqMessage.messageType;
    response.send(bodyResponse);
});

app.listen(config.PORT, config.HOST, () => {
    console.log(`App listening on http://${config.HOST}:${config.PORT}`);
});