const express = require('express');
const app = express()
app.use(express.json());
app.use(express.urlencoded({extended: true}));
const port = process.env.PORT || 5000;
require('dotenv').config();
const nsrestlet = require('nsrestlet');

//app.use(cors());

app.get("/", (request, response) => {
    response.send("Hola mundo");
})

app.get("/kin/api/v1/echoMessage", (request, response) => {
    response.send("Message Test");
});

app.post('/coreBanking/AUTH', (request, response) => {

    request = request.body;
    var accountSettings = {
        accountId: process.env.ACCOUNT_ID,
        tokenKey: process.env.TOKEN_KEY,
        tokenSecret: process.env.TOKEN_SECRET,
        consumerKey: process.env.CONSUMER_KEY,
        consumerSecret: process.env.CONSUMER_SECRET };
    var urlSettings = {
        url: process.env.URL
    }
    
    //create a link
    var myInvoices = nsrestlet.createLink(accountSettings, urlSettings);

    var messageResponse = {
        messageId: '',
        validationResponse:''
    }
    
    //then call get, post, put, or delete
    myInvoices.get({id: ''}, function(error, body)
    {
        // console.log("FINANCIAL INST: " + request.financial_institution_id);
        // console.log("ACCOUBT: " + request.accountNumber);
        // console.log("billingAmount: " + request.billingAmount);

        try {

            body.billingAmount = Number(body.billingAmount);

            if(request.financial_institution_id != body.financial_instituto_id) {
                messageResponse.messageId = request.messageId;
                messageResponse.validationResponse = "FINANCIAL_INSTITUTION_NOT_FOUND";
                response.status(404).send(messageResponse);
            } else if(request.accountNumber != body.accountNumber) {
                messageResponse.messageId = request.messageId;
                messageResponse.validationResponse = "ACCOUNT_NUMBER_NOT_FOUND";
                response.status(404).send(messageResponse);
            } else if(request.billingAmount > body.billingAmount) {
                messageResponse.messageId = request.messageId;
                messageResponse.validationResponse = "INSUFFICIENT_BALANCE";
                response.status(404).send(messageResponse);
            } else {
                messageResponse.messageId = request.messageId;
                messageResponse.validationResponse = "TRANSACTION_ACCEPTED";
                response.status(200).send(messageResponse);
            }
            
        } catch (error) {
            response.status(400).send("Error " + error);
        }        
        
    });
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

app.listen(process.env.PORT || 5000, () => {
    console.log(`App listening on port ${port}`);
});