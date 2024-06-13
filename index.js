const express = require('express');
const app = express()
app.use(express.json());
app.use(express.urlencoded({extended: true}));
const port = process.env.PORT || 5000;
require('dotenv').config();
const nsrestlet = require('nsrestlet');

//app.use(cors());

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

app.get("/", (request, response) => {
    response.send("Hola mundo");
})

app.get("/kin/api/v1/echoMessage", (request, response) => {
    response.send("Message Test");
});

app.post('/coreBanking/AUTH', (request, response) => {

    request = request.body;   

    var messageResponse = {
        messageId: '',
        validationResponse:'',
        serviceResponseFields: {
            ACCOUNT_BALANCE: 0,
            MEMO_DEBIT_AMOUNT: 0,
            MEMO_CREDIT_AMOUNT: 0,
            ACCT_BLOCK_CODE: 0
        }
    }
    
    //then call get, post, put, or delete
    myInvoices.get({type: 'AUTH'}, function(error, body)
    {      
        try {

            body.billingAmount = Number(body.billingAmount);

            console.log("REQUEST BILLING AMOUNT: " + request.billingAmount);

            if(request.financial_institution_id != body.financial_instituto_id) {
                messageResponse.messageId = request.messageId;
                messageResponse.validationResponse = "CORE_BANK_DECLINED";
                messageResponse.serviceResponseFields.ACCOUNT_BALANCE = body.billingAmount;
                messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = body.memoDebitAmount;
                messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = body.memoCreditAmount;
                response.status(200).send(messageResponse);
            } else if(request.accountNumber != body.accountNumber) {
                messageResponse.messageId = request.messageId;                
                messageResponse.validationResponse = "CORE_BANK_DECLINED";
                messageResponse.serviceResponseFields.ACCOUNT_BALANCE = body.billingAmount;
                messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = body.memoDebitAmount;
                messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = body.memoCreditAmount;
                response.status(200).send(messageResponse);
            // } else if(request.billingAmount > body.billingAmount) {
            } else if(request.billingAmount > body.billingAmount) {
                messageResponse.messageId = request.messageId;
                messageResponse.serviceResponseFields.ACCOUNT_BALANCE = body.billingAmount;
                messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = body.memoDebitAmount;
                messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = body.memoCreditAmount;
                //messageResponse.validationResponse = "THE_BANK_REJECTED_THE_TRANSACTION_INSUFFICIENT_FUNDS";
                messageResponse.validationResponse = "ACCT_LIMIT";
                response.status(200).send(messageResponse);
            } else {

                var nuevoSaldo = body.billingAmount - request.billingAmount;
                var numero = Number(0);

                console.log("NUEVO SALDO: " + nuevoSaldo);
                console.log(nuevoSaldo == numero ? "Uno" : "Dos");

                actualizarSaldo({idCustomer: 568, newBalance: nuevoSaldo == 0 ? 0.01 : nuevoSaldo, type: 'AUTH'});
                messageResponse.messageId = request.messageId;
                messageResponse.validationResponse = "OK";
                messageResponse.serviceResponseFields.ACCOUNT_BALANCE = nuevoSaldo;
                messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = nuevoSaldo;
                messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = body.memoCreditAmount;
                response.status(200).send(messageResponse);
            }
            
        } catch (error) {
            response.status(400).send("Error " + error);
        }        
        
    });
});

app.post('/coreBanking/REVERSAL', (request, response) => {

    request = request.body;   

    var messageResponse = {
        messageId: '',
        validationResponse:'',
        serviceResponseFields: {
            ACCOUNT_BALANCE: 0,
            MEMO_DEBIT_AMOUNT: 0,
            MEMO_CREDIT_AMOUNT: 0,
            ACCT_BLOCK_CODE: 0
        }
    }
    
    //then call get, post, put, or delete
    myInvoices.get({type: 'REVERSAL'}, function(error, body)
    {      
        try {
            
            body.billingAmount = Number(body.billingAmount);
            request.originalTxnAmount = Number(request.originalTxnAmount);
            body.memoDebitAmount = Number(body.memoDebitAmount);
            
            if(request.financial_institution_id != body.financial_instituto_id) {
                messageResponse.messageId = request.messageId;
                messageResponse.validationResponse = "CORE_BANK_DECLINED";
                messageResponse.serviceResponseFields.ACCOUNT_BALANCE = body.billingAmount;
                messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = body.memoDebitAmount;
                messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = body.memoCreditAmount;
                response.status(200).send(messageResponse);
            } else if(request.accountNumber != body.accountNumber) {
                messageResponse.messageId = request.messageId;
                messageResponse.validationResponse = "CORE_BANK_DECLINED";
                messageResponse.serviceResponseFields.ACCOUNT_BALANCE = body.billingAmount;
                messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = body.memoDebitAmount;
                messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = body.memoCreditAmount;
                response.status(200).send(messageResponse);           
            } else {                

                var nuevoSaldo = body.billingAmount + request.originalTxnAmount;
                var numero = Number(0)

                if(nuevoSaldo <= body.billingAmount) {
                    actualizarSaldo({idCustomer: 568, newBalance: nuevoSaldo, type: 'REVERSAL'})
                    messageResponse.messageId = request.messageId;
                    messageResponse.validationResponse = "OK";
                    messageResponse.serviceResponseFields.ACCOUNT_BALANCE = nuevoSaldo;
                    messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = body.memoDebitAmount;
                    messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = body.memoCreditAmount;
                    response.status(200).send(messageResponse);
                } else {
                    messageResponse.messageId = request.messageId;
                    messageResponse.validationResponse = "OK";
                    messageResponse.serviceResponseFields.ACCOUNT_BALANCE = body.billingAmount;
                    messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = body.memoDebitAmount;
                    messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = body.memoCreditAmount;
                    response.status(200).send(messageResponse);
                }

                // console.log("NUEVO SALDO: " + nuevoSaldo);
                // console.log(nuevoSaldo == numero ? "Uno" : "Dos")                
            }
            
        } catch (error) {
            response.status(400).send("Error " + error);
        }        
        
    });

});

function actualizarSaldo(nuevoSaldo) {

    console.log("NUEVO SALDO: " + nuevoSaldo.newBalance);

    myInvoices.put(nuevoSaldo).then(function(body) {
        console.log(body);
    })
    .catch(function(error) {
        console.log(error);
    });
}

app.post('/coreBanking/ADVICE', (request, response) => {    

    request = request.body;   

    var messageResponse = {
        messageId: '',
        validationResponse:'',
        serviceResponseFields: {
            ACCOUNT_BALANCE: 0,
            MEMO_DEBIT_AMOUNT: 0,
            MEMO_CREDIT_AMOUNT: 0,
            ACCT_BLOCK_CODE: 0
        }
    }

    myInvoices.get({type: 'REVERSAL'}, function(error, body)
    {      
        try {

            body.billingAmount = Number(body.billingAmount);
            request.originalTxnAmount = Number(request.originalTxnAmount);
            body.memoDebitAmount = Number(body.memoDebitAmount);
            
            if(request.financial_institution_id != body.financial_instituto_id) {
                messageResponse.messageId = request.messageId;
                messageResponse.validationResponse = "CORE_BANK_DECLINED";
                messageResponse.serviceResponseFields.ACCOUNT_BALANCE = body.billingAmount;
                messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = body.memoDebitAmount;
                messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = body.memoCreditAmount;
                response.status(200).send(messageResponse);
            } else if(request.accountNumber != body.accountNumber) {
                messageResponse.messageId = request.messageId;
                messageResponse.validationResponse = "CORE_BANK_DECLINED";
                messageResponse.serviceResponseFields.ACCOUNT_BALANCE = body.billingAmount;
                messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = body.memoDebitAmount;
                messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = body.memoCreditAmount;
                response.status(200).send(messageResponse);           
            } else {                

                var nuevoSaldo = body.billingAmount + request.originalTxnAmount;
                var numero = Number(0)

                if(nuevoSaldo <= body.billingAmount) {
                    actualizarSaldo({idCustomer: 568, newBalance: nuevoSaldo, type: 'REVERSAL'})
                    messageResponse.messageId = request.messageId;
                    messageResponse.validationResponse = "OK";
                    messageResponse.serviceResponseFields.ACCOUNT_BALANCE = body.billingAmount;
                    messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = body.memoDebitAmount;
                    messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = body.memoCreditAmount;
                    response.status(200).send(messageResponse);
                } else {
                    messageResponse.messageId = request.messageId;
                    messageResponse.validationResponse = "OK";
                    messageResponse.serviceResponseFields.ACCOUNT_BALANCE = body.billingAmount;
                    messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = body.billingAmount;
                    messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = body.memoCreditAmount;
                    response.status(200).send(messageResponse);
                }

                // console.log("NUEVO SALDO: " + nuevoSaldo);
                // console.log(nuevoSaldo == numero ? "Uno" : "Dos")                
            }
            
        } catch (error) {
            response.status(400).send("Error " + error);
        }         
        
    });
    
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