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

app.post('/coreBanking/authRequest', (request, response) => {    

    const reqMessage = request.body;

    var bodyResponse = {
        messageId : '',
        messageType : ''
    }

    // if(reqMessage.financial_institution_id != 'SOFIPA') {
    //     response.send({
    //         "error": "No existe la institución"
    //     });
    // }        

    if (reqMessage.financial_institution_id == 'SOFIPA' && reqMessage.messageType == "ECHO") {        
        bodyResponse.messageId = reqMessage.messageId;
        bodyResponse.messageType = reqMessage.messageType;
        response.send(bodyResponse);
    }


    if(reqMessage.financial_institution_id == 'SOFIPA' && reqMessage.messageType == "AUTH") {
        bodyResponse.messageId = reqMessage.messageId;
        bodyResponse.messageType = "OK";
        response.send(bodyResponse); 
    } else {
        bodyResponse.messageId = reqMessage.messageId;
        bodyResponse.messageType = "CORE_BANK_DECLINED";
        response.send(bodyResponse);
    }

});

app.post('/kin/api/v1/authRequest', (request, response) => {    

    const reqMessage = request.body;

    var bodyResponse = {
        messageId : '',
        messageType : ''
    }

    // if(reqMessage.financial_institution_id != 'SOFIPA') {
    //     response.send({
    //         "error": "No existe la institución"
    //     });
    // }

    if(reqMessage.financial_institution_id == 'SOFIPA') {
        bodyResponse.messageId = reqMessage.messageId;
        bodyResponse.messageType = "OK";
        response.send(bodyResponse); 
    } else {
        bodyResponse.messageId = reqMessage.messageId;
        bodyResponse.messageType = "CORE_BANK_DECLINED";
        response.send(bodyResponse);
    }

});

app.listen(PORT, () => {
    console.log(`Example app listening on port ${PORT}`)
});