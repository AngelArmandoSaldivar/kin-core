const express = require('express');
const app = express()
const bodyParser = require('body-parser');
app.use(express.json({limit:'50mb'}));
app.use(bodyParser.json());
app.use(express.urlencoded({extended: true}));
const port = process.env.PORT || 5000;
require('dotenv').config();
const nsrestlet = require('nsrestlet');
const axios = require('axios');
const fs = require('fs');
const archiver = require('archiver');
const { Buffer } = require('buffer');
const JSZip = require('jszip')
const path = require('path');
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

app.get('/coreBanking/RESPONSE_TIME', (req, res) => {    

    const startHrTime = process.hrtime();

    setTimeout(() => {
        res.send(`Response Time: ${calculoTiempoRespuesta(startHrTime)} ms`)        
    }, 1000);
});

function calculoTiempoRespuesta(startHrTime) {
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedTimeInMs = elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6;
    return elapsedTimeInMs.toFixed(3);
}

app.get("/", (request, response) => {
    response.send("Hola mundo");
})

app.get("/kin/api/v1/echoMessage", (request, response) => {
    response.send("Message Test");
});

app.post('/coreBanking/AUTH', (request, response) => {   
    
    const startHrTime = process.hrtime();

    request = request.body;

    var urlSettings2 = {
        url: process.env.URL + "&acctNumber=" + request.accountNumber
    }
    
    //create a link
    var myInvoices2 = nsrestlet.createLink(accountSettings, urlSettings2);

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
    myInvoices2.get({type: 'AUTH'}, function(error, body)
    {
        
        try {           
            console.log("=======INICIIO REQUEST AUTH========");
            console.log("REQUEST AUTH: " + JSON.stringify(request));
            console.log("=======FIN REQUEST AUTH========");

            body.billingAmount = Number(body.billingAmount);
            request.billingAmount = Number(request.billingAmount);            

            if(request.billingCurrencyNode == 2) {
                request.billingAmount = request.billingAmount / 100;
            }
            if(request.billingCurrencyNode == 1) {
                request.billingAmount = request.billingAmount / 10;
            }

            if(request.billingCurrencyNode == 0) {
                request.billingAmount = request.billingAmount / 1;
            }

            var totalMemoDebit = Number(body.memoDebitAmount) + Number(request.billingAmount);
            var totalMemoCredit = Number(body.memoCreditAmount) + Number(request.billingAmount);
                     
            if(request.messageSubType == 'AUTH_ONLY' && (totalMemoDebit > body.billingAmount || totalMemoCredit > body.billingAmount)) {

                if(request.billingCurrencyNode == 2) {
                    body.billingAmount = body.billingAmount * 100;
                    body.memoDebitAmount = body.memoDebitAmount * 100;
                    body.memoCreditAmount = body.memoCreditAmount * 100;
                }
                if(request.billingCurrencyNode == 1) {
                    body.billingAmount = body.billingAmount * 10;
                    body.memoDebitAmount = body.memoDebitAmount * 10;
                    body.memoCreditAmount = body.memoCreditAmount * 10;
                }
    
                if(request.billingCurrencyNode == 0) {
                    body.billingAmount = body.billingAmount * 1;
                    body.memoDebitAmount = body.memoDebitAmount * 1;
                    body.memoCreditAmount = body.memoCreditAmount * 1;
                }

                messageResponse.messageId = request.messageId;
                messageResponse.serviceResponseFields.ACCOUNT_BALANCE = body.billingAmount;
                messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = body.memoDebitAmount;
                messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = body.memoCreditAmount;
                messageResponse.validationResponse = "ACCT_LIMIT";
                response.status(200).send(messageResponse);
            } else if(request.financial_institution_id != body.financial_instituto_id) {
                messageResponse.messageId = request.messageId;
                messageResponse.validationResponse = "CORE_BANK_DECLINED";
                messageResponse.serviceResponseFields.ACCOUNT_BALANCE = body.billingAmount;
                messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = body.memoDebitAmount;
                messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = body.memoCreditAmount;
                messageResponse.serviceResponseFields.ACCT_BLOCK_CODE = 1;
                response.status(200).send(messageResponse);
            } else if(request.accountNumber != body.accountNumber) {
                messageResponse.messageId = request.messageId;
                messageResponse.validationResponse = "CORE_BANK_DECLINED";
                messageResponse.serviceResponseFields.ACCOUNT_BALANCE = body.billingAmount;
                messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = body.memoDebitAmount;
                messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = body.memoCreditAmount;
                messageResponse.serviceResponseFields.ACCT_BLOCK_CODE = 1;
                response.status(200).send(messageResponse);
            } else if(request.billingAmount > body.billingAmount) {

                if(request.billingCurrencyNode == 2) {
                    body.billingAmount = body.billingAmount * 100;
                    body.memoDebitAmount = body.memoDebitAmount * 100;
                    body.memoCreditAmount = body.memoCreditAmount * 100;
                }
                if(request.billingCurrencyNode == 1) {
                    body.billingAmount = body.billingAmount * 10;
                    body.memoDebitAmount = body.memoDebitAmount * 10;
                    body.memoCreditAmount = body.memoCreditAmount * 10;
                }
    
                if(request.billingCurrencyNode == 0) {
                    body.billingAmount = body.billingAmount * 1;
                    body.memoDebitAmount = body.memoDebitAmount * 1;
                    body.memoCreditAmount = body.memoCreditAmount * 1;
                }

                messageResponse.messageId = request.messageId;
                messageResponse.serviceResponseFields.ACCOUNT_BALANCE = body.billingAmount;
                messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = body.memoDebitAmount;
                messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = body.memoCreditAmount;
                messageResponse.validationResponse = "ACCT_LIMIT";
                response.status(200).send(messageResponse);
            } else {
                  
            var transaction = {
                "messageId": "",
                "billingAmount": 0,
                "authResponse": '00'
            }

           
            if (request.messageSubType == 'AUTH_ONLY' && request.creditDebitFlag == 'D') {
                
                var nuevoMemoDebitAmount = Number(body.memoDebitAmount) + request.billingAmount;

                transaction.billingAmount = request.billingAmount;
                transaction.messageId = request.messageId;
                var arrayTransactions = JSON.parse(body.transactions);
                arrayTransactions.push(transaction);
               
                actualizarSaldo({idCustomer: body.idCustomer, newMemoDebit: nuevoMemoDebitAmount, newTransaction: JSON.stringify(arrayTransactions)});

                if(request.billingCurrencyNode == 2) {
                    body.billingAmount = body.billingAmount * 100;
                    body.memoCreditAmount = body.memoCreditAmount * 100;
                    nuevoMemoDebitAmount = nuevoMemoDebitAmount * 100;
                }
                if(request.billingCurrencyNode == 1) {
                    body.billingAmount = body.billingAmount * 10;
                    body.memoCreditAmount = body.memoCreditAmount * 10;
                    nuevoMemoDebitAmount = nuevoMemoDebitAmount * 10;
                }
    
                if(request.billingCurrencyNode == 0) {
                    body.billingAmount = body.billingAmount * 1;
                    body.memoCreditAmount = body.memoCreditAmount * 1;
                    nuevoMemoDebitAmount = nuevoMemoDebitAmount * 1;
                }  

                messageResponse.messageId = request.messageId;
                messageResponse.validationResponse = "OK";
                messageResponse.serviceResponseFields.ACCOUNT_BALANCE = body.billingAmount;
                messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(nuevoMemoDebitAmount);
                messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
                console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                console.log("==========FINAL A AUTH==============");                
                response.status(200).send(messageResponse);

            } else if(request.messageSubType == 'AUTH_ONLY' && request.creditDebitFlag == 'C'){
                var nuevoMemoCreditAmount = Number(body.memoCreditAmount) + request.billingAmount;

                transaction.billingAmount = request.billingAmount;
                transaction.messageId = request.messageId;
                var arrayTransactions = JSON.parse(body.transactions);
                arrayTransactions.push(transaction);

                actualizarSaldo({idCustomer: body.idCustomer, newMemoCredit: nuevoMemoCreditAmount, newTransaction: JSON.stringify(arrayTransactions)});

                if(request.billingCurrencyNode == 2) {
                    body.billingAmount = body.billingAmount * 100;
                    body.memoDebitAmount = body.memoDebitAmount * 100;
                    nuevoMemoCreditAmount = nuevoMemoCreditAmount * 100;
                }
                if(request.billingCurrencyNode == 1) {
                    body.billingAmount = body.billingAmount * 10;
                    body.memoDebitAmount = body.memoDebitAmount * 10;
                    nuevoMemoCreditAmount = nuevoMemoCreditAmount * 10;
                }

                if(request.billingCurrencyNode == 0) {
                    body.billingAmount = body.billingAmount * 1;
                    body.memoDebitAmount = body.memoDebitAmount * 1;
                    nuevoMemoCreditAmount = nuevoMemoCreditAmount * 1;
                }

                messageResponse.messageId = request.messageId;
                messageResponse.validationResponse = "OK";
                messageResponse.serviceResponseFields.ACCOUNT_BALANCE = body.billingAmount;
                messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(body.memoDebitAmount);
                messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(nuevoMemoCreditAmount);
                console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                console.log("==========FINAL A AUTH==============");                
                response.status(200).send(messageResponse);

            } else if(request.messageSubType == 'FINANCIAL' && request.creditDebitFlag == 'D' && request.originalMessageId != undefined) {

                transaction.billingAmount = request.billingAmount;
                transaction.messageId = request.originalMessageId;
                var arrayTransactions = JSON.parse(body.transactions);

                //Busqueda y eliminación

                var foundItem = arrayTransactions.find(item => item.messageId === request.originalMessageId);

                //if(foundItem) {                    

                    //arrayTransactions = arrayTransactions.filter(item => item.messageId !== request.originalMessageId);
                    var nuevoSaldo = Number(body.billingAmount) - Number(request.billingAmount);
                    var nuevoMemoDebitAmount = Number(body.memoDebitAmount) - Number(request.billingAmount);
                    
                    actualizarSaldo({idCustomer: body.idCustomer, newBalance: nuevoSaldo == 0 ? 0.01 : nuevoSaldo, newMemoDebit: nuevoMemoDebitAmount, newTransaction: JSON.stringify(arrayTransactions)});
                    
                    if(request.billingCurrencyNode == 2) {
                        nuevoSaldo = nuevoSaldo * 100;
                        nuevoMemoDebitAmount = nuevoMemoDebitAmount * 100;
                        body.memoCreditAmount = body.memoCreditAmount * 100;
                    }
                    if(request.billingCurrencyNode == 1) {
                        nuevoSaldo = nuevoSaldo * 10;
                        nuevoMemoDebitAmount = nuevoMemoDebitAmount * 10;
                        body.memoCreditAmount = body.memoCreditAmount * 10;
                    }

                    if(request.billingCurrencyNode == 0) {
                        nuevoSaldo = nuevoSaldo * 1;
                        nuevoMemoDebitAmount = nuevoMemoDebitAmount * 1;
                        body.memoCreditAmount = body.memoCreditAmount * 1;
                    }

                    setTimeout(() => {
                        messageResponse.messageId = request.messageId;
                        messageResponse.validationResponse = "OK";
                        messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(nuevoSaldo);
                        messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(nuevoMemoDebitAmount);
                        messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
                        console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                        console.log("==========FINAL A AUTH==============");                
                        response.status(200).send(messageResponse);
                    }, 200000);                           

                /*} else {
                    response.send("No existe");
                }*/
                
            } else if(request.messageSubType == 'FINANCIAL' && request.creditDebitFlag == 'C' && request.originalMessageId != undefined) {

                transaction.billingAmount = request.billingAmount;
                transaction.messageId = request.originalMessageId;
                var arrayTransactions = JSON.parse(body.transactions);

                var foundItem = arrayTransactions.find(item => item.messageId === request.originalMessageId);

                if(foundItem) {                    
                    
                    var nuevoSaldo = Number(body.billingAmount) - Number(request.billingAmount);
                    var nuevoMemoCreditAmount = Number(body.memoCreditAmount) - Number(request.billingAmount);

                    actualizarSaldo({idCustomer: body.idCustomer, newBalance: nuevoSaldo == 0 ? 0.01 : nuevoSaldo, newMemoCredit: nuevoMemoCreditAmount, newTransaction: JSON.stringify(arrayTransactions)});
                    
                    if(request.billingCurrencyNode == 2) {
                        nuevoSaldo = nuevoSaldo * 100;
                        body.memoDebitAmount = body.memoDebitAmount * 100;
                        nuevoMemoCreditAmount = nuevoMemoCreditAmount * 100;
                    }
                    if(request.billingCurrencyNode == 1) {
                        nuevoSaldo = nuevoSaldo * 10;
                        body.memoDebitAmount = body.memoDebitAmount * 10;
                        nuevoMemoCreditAmount = nuevoMemoCreditAmount * 10;
                    }

                    if(request.billingCurrencyNode == 0) {
                        nuevoSaldo = nuevoSaldo * 1;
                        body.memoDebitAmount = body.memoDebitAmount * 1;
                        nuevoMemoCreditAmount = nuevoMemoCreditAmount * 1;
                    }
        
                    messageResponse.messageId = request.messageId;
                    messageResponse.validationResponse = "OK";
                    messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(nuevoSaldo);
                    messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(body.memoDebitAmount);
                    messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(nuevoMemoCreditAmount);
                    console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                    console.log("==========FINAL A AUTH==============");                
                    response.status(200).send(messageResponse);
                } else {
                    response.send("No se encuentra la transaccion");
                }             
            } else if(request.messageSubType == 'FINANCIAL' && request.originalMessageId == undefined && (request.creditDebitFlag == 'C' || request.creditDebitFlag == 'D')) {

var nuevoSaldo = Number(body.billingAmount) - Number(request.billingAmount);                

actualizarSaldo({idCustomer: body.idCustomer, newBalance: nuevoSaldo == 0 ? 0.01 : nuevoSaldo});

if(request.billingCurrencyNode == 2) {
nuevoSaldo = nuevoSaldo * 100;
body.memoDebitAmount = body.memoDebitAmount * 100;
nuevoMemoCreditAmount = nuevoMemoCreditAmount * 100;
}
if(request.billingCurrencyNode == 1) {
nuevoSaldo = nuevoSaldo * 10;
body.memoDebitAmount = body.memoDebitAmount * 10;
nuevoMemoCreditAmount = nuevoMemoCreditAmount * 10;
}

if(request.billingCurrencyNode == 0) {
nuevoSaldo = nuevoSaldo * 1;
body.memoDebitAmount = body.memoDebitAmount * 1;
nuevoMemoCreditAmount = nuevoMemoCreditAmount * 1;
}

messageResponse.messageId = request.messageId;
messageResponse.validationResponse = "OK";
messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(nuevoSaldo);
messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(body.memoDebitAmount);
messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
console.log("==========FINAL A AUTH==============");                
response.status(200).send(messageResponse);
            }
            }
            
        } catch (error) {
            response.status(400).send("Error " + error);
        }
        
    });
});

app.post('/coreBanking/REVERSAL', (request, response) => {
    
    const startHrTime = process.hrtime();

    request = request.body;

    var urlSettings2 = {
        url: process.env.URL + "&acctNumber=" + request.accountNumber
    }
    
    //create a link
    var myInvoices2 = nsrestlet.createLink(accountSettings, urlSettings2);

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
    
    setTimeout(() => {
        myInvoices2.get({type: 'REVERSAL'}, function(error, body)
    {      
        try {

            console.log("=======INICIIO REQUEST REVERSAL========");
            console.log("REQUEST REVERSAL: " + JSON.stringify(request));
            console.log("=======FIN REQUEST REVERSAL========");

            body.billingAmount = Number(body.billingAmount);            
            request.originalTxnAmount = Number(request.originalTxnAmount);
            request.billingAmount = Number(request.billingAmount);
            body.memoDebitAmount = Number(body.memoDebitAmount);

            
            if(request.billingCurrencyNode == 2) {
                console.log("ENTRASTE");
                request.billingAmount = request.billingAmount / 100;
            }
            if(request.billingCurrencyNode == 1) {
                request.billingAmount = request.billingAmount / 10;
            }

            if(request.billingCurrencyNode == 0) {
                request.billingAmount = request.billingAmount / 1;
            }           
            
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
                              
                var transaction = {
                    "messageId": "",
                    "billingAmount": 0
                }
                                   
                if (request.messageSubType == 'FINANCIAL') {

                    console.log("ENTRASTE REVERSAL");
                                        
                    transaction.billingAmount = request.billingAmount;
                    transaction.messageId = request.originalMessageId;
                    var arrayTransactions = JSON.parse(body.transactions);
    
                    //Busqueda y eliminación    
                    //var foundItem = arrayTransactions.find(item => item.messageId === request.originalMessageId);
    
                    //if(foundItem) {

                        var nuevoSaldo = Number(body.billingAmount) + Number(request.billingAmount);
                        
                        actualizarSaldo({idCustomer: body.idCustomer, newBalance: nuevoSaldo, newTransaction: JSON.stringify(arrayTransactions)});
                        
                        if(request.billingCurrencyNode == 2) {
                            body.memoDebitAmount = body.memoDebitAmount * 100;
                            nuevoSaldo = nuevoSaldo * 100;
                            body.memoCreditAmount = body.memoCreditAmount * 100;
                        }
                        if(request.billingCurrencyNode == 1) {
                            body.memoDebitAmount = body.memoDebitAmount * 10;
                            nuevoSaldo = nuevoSaldo * 10;
                            body.memoCreditAmount = body.memoCreditAmount * 10;
                        }
    
                        if(request.billingCurrencyNode == 0) {
                            body.memoDebitAmount = body.memoDebitAmount * 1;
                            nuevoSaldo = nuevoSaldo * 1;
                            body.memoCreditAmount = body.memoCreditAmount * 1;
                        }
            
                        messageResponse.messageId = request.messageId;
                        messageResponse.validationResponse = "OK";
                        messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(nuevoSaldo);
                        messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(body.memoDebitAmount);
                        messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
                        console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                        console.log("==========FINAL A AUTH==============");
                        response.status(200).send(messageResponse);
    
                    /*} else {
                        console.log("TRANSCTION " + request.originalMessageId + " NOT FOUND.");
                        if(request.billingCurrencyNode == 2) {
                            body.billingAmount = body.billingAmount * 100;
                            body.memoDebitAmount = body.memoDebitAmount * 100;
                            body.memoCreditAmount = body.memoCreditAmount * 100;
                        }
                        if(request.billingCurrencyNode == 1) {
                            body.billingAmount = body.billingAmount * 10;
                            body.memoDebitAmount = body.memoDebitAmount * 10;
                            body.memoCreditAmount = body.memoCreditAmount * 10;
                        }
    
                        if(request.billingCurrencyNode == 0) {
                            body.billingAmount = body.billingAmount * 1;
                            body.memoDebitAmount = body.memoDebitAmount * 1;
                            body.memoCreditAmount = body.memoCreditAmount * 1;
                        }
            
                        messageResponse.messageId = request.messageId;
                        messageResponse.validationResponse = "OK";
                        messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(body.billingAmount);
                        messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(body.memoDebitAmount);
                        messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
                        console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                        console.log("==========FINAL A AUTH==============");
                        response.status(200).send(messageResponse);

                    }*/
                
                }              

                else if (request.messageSubType == 'AUTH_ONLY' && request.creditDebitFlag == 'C') {
                                        
                    transaction.billingAmount = request.billingAmount;
                    transaction.messageId = request.originalMessageId;
                    var arrayTransactions = JSON.parse(body.transactions);
                  
                    var foundItem = arrayTransactions.find(item => item.messageId === request.originalMessageId);

                    console.log("FOUND ITEM: " + JSON.stringify(foundItem));
    
                    if(foundItem) {                        
                           
                        var nuevoMemoCreditAmount = Number(foundItem.billingAmount) != Number(request.billingAmount) ? Number(body.memoCreditAmount) - Number(request.billingAmount) : Number(body.memoCreditAmount) - Number(foundItem.billingAmount);                        
                        
                        actualizarSaldo({idCustomer: body.idCustomer, newMemoCredit: nuevoMemoCreditAmount, newTransaction: JSON.stringify(arrayTransactions)});
                        
                        if(request.billingCurrencyNode == 2) {
                            body.billingAmount = body.billingAmount * 100;
                            nuevoMemoCreditAmount = nuevoMemoCreditAmount * 100;
                            body.memoDebitAmount = body.memoDebitAmount * 100;
                        }
                        if(request.billingCurrencyNode == 1) {
                            body.billingAmount = body.billingAmount * 10;
                            nuevoMemoCreditAmount = nuevoMemoCreditAmount * 10;
                            body.memoDebitAmount = body.memoDebitAmount * 10;
                        }
    
                        if(request.billingCurrencyNode == 0) {
                            body.billingAmount = body.billingAmount * 1;
                            nuevoMemoCreditAmount = nuevoMemoCreditAmount * 1;
                            body.memoDebitAmount = body.memoDebitAmount * 1;
                        }
            
                        messageResponse.messageId = request.messageId;
                        messageResponse.validationResponse = "OK";
                        messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(body.billingAmount);
                        messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(body.memoDebitAmount);
                        messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(nuevoMemoCreditAmount);
                        console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                        console.log("==========FINAL A AUTH==============");
                        response.status(200).send(messageResponse);
    
                    } else {
                        console.log("NOT FOUND");
                        
                        if(request.billingCurrencyNode == 2) {
                            body.billingAmount = body.billingAmount * 100;
                            body.memoDebitAmount = body.memoDebitAmount * 100;
                            body.memoCreditAmount = body.memoCreditAmount * 100;
                        }
                        if(request.billingCurrencyNode == 1) {
                            body.billingAmount = body.billingAmount * 10;
                            body.memoDebitAmount = body.memoDebitAmount * 10;
                            body.memoCreditAmount = body.memoCreditAmount * 10;
                        }
    
                        if(request.billingCurrencyNode == 0) {
                            body.billingAmount = body.billingAmount * 1;
                            body.memoDebitAmount = body.memoDebitAmount * 1;
                            body.memoCreditAmount = body.memoCreditAmount * 1;
                        }
            
                        messageResponse.messageId = request.messageId;
                        messageResponse.validationResponse = "OK";
                        messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(body.billingAmount);
                        messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(body.memoDebitAmount);
                        messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
                        console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                        console.log("==========FINAL A AUTH==============");
                        response.status(200).send(messageResponse);

                    }
                }
                
                if (request.messageSubType == 'AUTH_ONLY' && request.creditDebitFlag == 'D' ) {
                                        
                    transaction.billingAmount = request.billingAmount;
                    transaction.messageId = request.originalMessageId;
                    var arrayTransactions = JSON.parse(body.transactions);

                    //Busqueda y eliminación
    
                    var foundItem = arrayTransactions.find(item => item.messageId === request.originalMessageId);
    
                    if(foundItem) {
                           
                        var nuevoMemoDebit = Number(foundItem.billingAmount) != Number(request.billingAmount) ? Number(body.memoDebitAmount) - Number(request.billingAmount) : Number(body.memoDebitAmount) - Number(foundItem.billingAmount);
                        
                        actualizarSaldo({idCustomer: body.idCustomer, newMemoDebit: nuevoMemoDebit, newTransaction: JSON.stringify(arrayTransactions)});
                        
                        if(request.billingCurrencyNode == 2) {
                            body.billingAmount = body.billingAmount * 100;
                            nuevoMemoDebit = nuevoMemoDebit * 100;
                            body.memoCreditAmount = body.memoCreditAmount * 100;
                        }
                        if(request.billingCurrencyNode == 1) {
                            body.billingAmount = body.billingAmount * 10;
                            nuevoMemoDebit = nuevoMemoDebit * 10;
                            body.memoCreditAmount = body.memoCreditAmount * 10;
                        }
    
                        if(request.billingCurrencyNode == 0) {
                            body.billingAmount = body.billingAmount * 1;
                            nuevoMemoDebit = nuevoMemoDebit * 1;
                            body.memoCreditAmount = body.memoCreditAmount * 1;
                        }
            
                        messageResponse.messageId = request.messageId;
                        messageResponse.validationResponse = "OK";
                        messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(body.billingAmount);
                        messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(nuevoMemoDebit);
                        messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
                        console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                        console.log("==========FINAL A AUTH==============");
                        response.status(200).send(messageResponse);
    
                    } else {
                        
                        if(request.billingCurrencyNode == 2) {
                            body.billingAmount = body.billingAmount * 100;
                            body.memoDebitAmount = body.memoDebitAmount * 100;
                            body.memoCreditAmount = body.memoCreditAmount * 100;
                        }
                        if(request.billingCurrencyNode == 1) {
                            body.billingAmount = body.billingAmount * 10;
                            body.memoDebitAmount = body.memoDebitAmount * 10;
                            body.memoCreditAmount = body.memoCreditAmount * 10;
                        }
    
                        if(request.billingCurrencyNode == 0) {
                            body.billingAmount = body.billingAmount * 1;
                            body.memoDebitAmount = body.memoDebitAmount * 1;
                            body.memoCreditAmount = body.memoCreditAmount * 1;
                        }
            
                        messageResponse.messageId = request.messageId;
                        messageResponse.validationResponse = "OK";
                        messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(body.billingAmount);
                        messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(body.memoDebitAmount);
                        messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
                        console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                        console.log("==========FINAL A AUTH==============");
                        response.status(200).send(messageResponse);

                    }
                
                }

            }
            
        } catch (error) {
            response.status(400).send("Error " + error);
        }
    });
    }, 1000);

});

function actualizarSaldo(nuevoSaldo) {    

    myInvoices.put(nuevoSaldo).then(function(body) {
        //console.log(body);
    })
    .catch(function(error) {
        console.log(error);
    });
}

app.post('/coreBanking/ADVICE', (request, response) => {    

    console.log("==========ENTRASTE A AUTH==============");
    
    const startHrTime = process.hrtime();

    request = request.body;

    var urlSettings2 = {
        url: process.env.URL + "&acctNumber=" + request.accountNumber
    }
    
    //create a link
    var myInvoices2 = nsrestlet.createLink(accountSettings, urlSettings2);

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

    var messageResponse2 = {
        messageId: '',
        validationResponse:'',
        serviceResponseFields: {
            ACCOUNT_BALANCE: 0,
            MEMO_DEBIT_AMOUNT: 0,
            MEMO_CREDIT_AMOUNT: 0,
            ACCT_BLOCK_CODE: 0,
            CORE_BANK_DEC_REASON_CODE: 0
        }
    }

    myInvoices2.get({type: 'REVERSAL'}, function(error, body)
    {      
        try {

            console.log("=======INICIIO REQUEST ADVICE========");
            console.log("REQUEST AUTH: " + JSON.stringify(request));
            console.log("=======FIN REQUEST ADVICE========");
            
            body.billingAmount = Number(body.billingAmount);            
            request.billingAmount = Number(request.billingAmount);

            if(request.billingCurrencyNode == 2) {
                request.billingAmount = request.billingAmount / 100;
            }
            if(request.billingCurrencyNode == 1) {
                request.billingAmount = request.billingAmount / 10;
            }

            if(request.billingCurrencyNode == 0) {
                request.billingAmount = request.billingAmount / 1;
            }
            


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

                var transaction = {
                    "messageId": "",
                    "billingAmount": 0
                }
                   
                if (request.messageSubType == 'AUTH_ONLY' && request.creditDebitFlag == 'D') {
                    
                    var nuevoMemoDebitAmount = Number(body.memoDebitAmount) + request.billingAmount;
    
                    transaction.billingAmount = request.billingAmount;
                    transaction.messageId = request.messageId;
                    var arrayTransactions = JSON.parse(body.transactions);
                    arrayTransactions.push(transaction);
                   
                    actualizarSaldo({idCustomer: body.idCustomer, newMemoDebit: nuevoMemoDebitAmount, newTransaction: JSON.stringify(arrayTransactions)});
    
                    if(request.billingCurrencyNode == 2) {
                        body.billingAmount = body.billingAmount * 100;
                        body.memoCreditAmount = body.memoCreditAmount * 100;
                        nuevoMemoDebitAmount = nuevoMemoDebitAmount * 100;
                    }
                    if(request.billingCurrencyNode == 1) {
                        body.billingAmount = body.billingAmount * 10;
                        body.memoCreditAmount = body.memoCreditAmount * 10;
                        nuevoMemoDebitAmount = nuevoMemoDebitAmount * 10;
                    }
        
                    if(request.billingCurrencyNode == 0) {
                        body.billingAmount = body.billingAmount * 1;
                        body.memoCreditAmount = body.memoCreditAmount * 1;
                        nuevoMemoDebitAmount = nuevoMemoDebitAmount * 1;
                    }  
    
                    messageResponse.messageId = request.messageId;
                    messageResponse.validationResponse = "OK";
                    messageResponse.serviceResponseFields.ACCOUNT_BALANCE = body.billingAmount;
                    messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(nuevoMemoDebitAmount);
                    messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
                    console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                    console.log("==========FINAL A AUTH==============");                
                    response.status(200).send(messageResponse);
    
                } else if(request.messageSubType == 'AUTH_ONLY' && request.creditDebitFlag == 'C'){
                    var nuevoMemoCreditAmount = Number(body.memoCreditAmount) + request.billingAmount;
    
                    transaction.billingAmount = request.billingAmount;
                    transaction.messageId = request.messageId;
                    var arrayTransactions = JSON.parse(body.transactions);
                    arrayTransactions.push(transaction);
    
                    actualizarSaldo({idCustomer: body.idCustomer, newMemoCredit: nuevoMemoCreditAmount, newTransaction: JSON.stringify(arrayTransactions)});
    
                    if(request.billingCurrencyNode == 2) {
                        body.billingAmount = body.billingAmount * 100;
                        body.memoDebitAmount = body.memoDebitAmount * 100;
                        nuevoMemoCreditAmount = nuevoMemoCreditAmount * 100;
                    }
                    if(request.billingCurrencyNode == 1) {
                        body.billingAmount = body.billingAmount * 10;
                        body.memoDebitAmount = body.memoDebitAmount * 10;
                        nuevoMemoCreditAmount = nuevoMemoCreditAmount * 10;
                    }
    
                    if(request.billingCurrencyNode == 0) {
                        body.billingAmount = body.billingAmount * 1;
                        body.memoDebitAmount = body.memoDebitAmount * 1;
                        nuevoMemoCreditAmount = nuevoMemoCreditAmount * 1;
                    }
    
                    messageResponse.messageId = request.messageId;
                    messageResponse.validationResponse = "OK";
                    messageResponse.serviceResponseFields.ACCOUNT_BALANCE = body.billingAmount;
                    messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(body.memoDebitAmount);
                    messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(nuevoMemoCreditAmount);
                    console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                    console.log("==========FINAL A AUTH==============");                
                    response.status(200).send(messageResponse);
    
                } else if(request.messageSubType == 'FINANCIAL' && request.creditDebitFlag == 'D'/* && request.originalMessageId != undefined*/) {
    
                    transaction.billingAmount = request.billingAmount;
                    transaction.messageId = request.originalMessageId;
                    var arrayTransactions = JSON.parse(body.transactions);
    
                    //Busqueda y eliminación
    
                    //var foundItem = arrayTransactions.find(item => item.messageId === request.originalMessageId);
    
                    //if(foundItem) {                    
    
                        //arrayTransactions = arrayTransactions.filter(item => item.messageId !== request.originalMessageId);                    
                        var nuevoSaldo = Number(body.billingAmount) - Number(request.billingAmount);
                        //var nuevoMemoDebitAmount = Number(body.memoDebitAmount) - Number(request.billingAmount);
                        
                        actualizarSaldo({idCustomer: body.idCustomer, newBalance: nuevoSaldo == 0 ? 0.01 : nuevoSaldo, newTransaction: JSON.stringify(arrayTransactions)});
                        
                        if(request.billingCurrencyNode == 2) {
                            nuevoSaldo = nuevoSaldo * 100;
                            body.memoDebitAmount = body.memoDebitAmount * 100;
                            body.memoCreditAmount = body.memoCreditAmount * 100;
                        }
                        if(request.billingCurrencyNode == 1) {
                            nuevoSaldo = nuevoSaldo * 10;
                            body.memoDebitAmount = body.memoDebitAmount * 10;
                            body.memoCreditAmount = body.memoCreditAmount * 10;
                        }
    
                        if(request.billingCurrencyNode == 0) {
                            nuevoSaldo = nuevoSaldo * 1;
                            body.memoDebitAmount = body.memoDebitAmount * 1;
                            body.memoCreditAmount = body.memoCreditAmount * 1;
                        }
            
                        messageResponse.messageId = request.messageId;
                        messageResponse.validationResponse = "OK";
                        messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(nuevoSaldo);
                        messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(body.memoDebitAmount);
                        messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
                        console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                        console.log("==========FINAL A AUTH==============");                
                        response.status(200).send(messageResponse);
    
                    /*} else {
                        messageResponse.messageId = request.messageId;
                        messageResponse.validationResponse = "OK";
                        messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(request.billingAmount);
                        messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(request.memoDebitAmount);
                        messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
                        console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                        console.log("==========FINAL A AUTH==============");                
                        response.status(200).send(messageResponse);
                    }*/
                    
                } else if(request.messageSubType == 'FINANCIAL' && request.creditDebitFlag == 'C' /*&& request.originalMessageId != undefined*/) {
    
                    transaction.billingAmount = request.billingAmount;
                    transaction.messageId = request.originalMessageId;
                    var arrayTransactions = JSON.parse(body.transactions);
    
                    //Busqueda y eliminación
    
                    //var foundItem = arrayTransactions.find(item => item.messageId === request.originalMessageId);
    
                    //if(foundItem) {                    
    
                        //arrayTransactions = arrayTransactions.filter(item => item.messageId !== request.originalMessageId);
                        var nuevoSaldo = Number(body.billingAmount) - Number(request.billingAmount);
                        //var nuevoMemoCreditAmount = Number(body.memoCreditAmount) - Number(request.billingAmount);
    
                        actualizarSaldo({idCustomer: body.idCustomer, newBalance: nuevoSaldo == 0 ? 0.01 : nuevoSaldo, newTransaction: JSON.stringify(arrayTransactions)});
                        
                        if(request.billingCurrencyNode == 2) {
                            nuevoSaldo = nuevoSaldo * 100;
                            body.memoDebitAmount = body.memoDebitAmount * 100;
                            body.memoCreditAmount = body.memoCreditAmount * 100;
                        }
                        if(request.billingCurrencyNode == 1) {
                            nuevoSaldo = nuevoSaldo * 10;
                            body.memoDebitAmount = body.memoDebitAmount * 10;
                            body.memoCreditAmount = body.memoCreditAmount * 10;
                        }
    
                        if(request.billingCurrencyNode == 0) {
                            nuevoSaldo = nuevoSaldo * 1;
                            body.memoDebitAmount = body.memoDebitAmount * 1;
                            body.memoCreditAmount = body.memoCreditAmount * 1;
                        }
            
                        messageResponse.messageId = request.messageId;
                        messageResponse.validationResponse = "OK";
                        messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(nuevoSaldo);
                        messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(body.memoDebitAmount);
                        messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
                        console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                        console.log("==========FINAL A AUTH==============");                
                        response.status(200).send(messageResponse);
                    /*} else {
                        messageResponse.messageId = request.messageId;
                        messageResponse.validationResponse = "OK";
                        messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(body.billingAmount);
                        messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(body.memoDebitAmount);
                        messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
                        console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                        console.log("==========FINAL A AUTH==============");                
                        response.status(200).send(messageResponse);
                    }*/             
                } 
                /*else if(request.messageSubType == 'FINANCIAL' && request.originalMessageId == undefined && (request.creditDebitFlag == 'C' || request.creditDebitFlag == 'D')) {
                        
                    var nuevoSaldo = Number(body.billingAmount) - Number(request.billingAmount);                
    
                    actualizarSaldo({idCustomer: body.idCustomer, newBalance: nuevoSaldo == 0 ? 0.01 : nuevoSaldo});
                    
                    if(request.billingCurrencyNode == 2) {
                        nuevoSaldo = nuevoSaldo * 100;
                        body.memoDebitAmount = body.memoDebitAmount * 100;
                        nuevoMemoCreditAmount = nuevoMemoCreditAmount * 100;
                    }
                    if(request.billingCurrencyNode == 1) {
                        nuevoSaldo = nuevoSaldo * 10;
                        body.memoDebitAmount = body.memoDebitAmount * 10;
                        nuevoMemoCreditAmount = nuevoMemoCreditAmount * 10;
                    }
    
                    if(request.billingCurrencyNode == 0) {
                        nuevoSaldo = nuevoSaldo * 1;
                        body.memoDebitAmount = body.memoDebitAmount * 1;
                        nuevoMemoCreditAmount = nuevoMemoCreditAmount * 1;
                    }
        
                    messageResponse.messageId = request.messageId;
                    messageResponse.validationResponse = "OK";
                    messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(nuevoSaldo);
                    messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(body.memoDebitAmount);
                    messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
                    console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                    console.log("==========FINAL A AUTH==============");                
                    response.status(200).send(messageResponse);
                }*/
                     
            }
            
        } catch (error) {
            response.status(400).send("Error " + error);
        }         
        
    });
    
});

app.post('/coreBanking/REVADV', (request, response) => {    

    console.log("==========ENTRASTE A REVADV==============");
    
    const startHrTime = process.hrtime();

    request = request.body;

    var urlSettings2 = {
        url: process.env.URL + "&acctNumber=" + request.accountNumber
    }
    
    //create a link
    var myInvoices2 = nsrestlet.createLink(accountSettings, urlSettings2);

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
    
    myInvoices2.get({type: 'REVADV'}, function(error, body)
    {      
        try {

            console.log("=======INICIIO REQUEST REVADV========");
            console.log("REQUEST AUTH: " + JSON.stringify(request));
            console.log("=======FIN REQUEST REVADV========");
            
            body.billingAmount = Number(body.billingAmount);            
            request.billingAmount = Number(request.billingAmount);

            if(request.billingCurrencyNode == 2) {
                request.billingAmount = request.billingAmount / 100;
            }
            if(request.billingCurrencyNode == 1) {
                request.billingAmount = request.billingAmount / 10;
            }

            if(request.billingCurrencyNode == 0) {
                request.billingAmount = request.billingAmount / 1;
            }
            
            

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

                var transaction = {
                    "messageId": "",
                    "billingAmount": 0
                }
                
                if(request.messageSubType == 'AUTH_ONLY' && request.creditDebitFlag == 'D') {

                    var arrayTransactions = JSON.parse(body.transactions);

                    var authResponse2 = {
                        authResponse: ''
                    }

                    if(request.authResponse == '00') {

                        arrayTransactions.forEach(element => {
                            if(element.authResponse == '00') {
                                authResponse2.authResponse =  element.authResponse;
                            }else if(element.authResponse == '05'){
                                authResponse2.authResponse = '05';
                            } else {
                                authResponse2.authResponse = '';
                            }
                        });                                                            
                        
                        if(authResponse2.authResponse == '00') {
                            if(request.billingCurrencyNode == 2) {
                                body.billingAmount = body.billingAmount * 100;
                                body.memoCreditAmount = body.memoCreditAmount * 100;
                                body.memoDebitAmount = body.memoDebitAmount * 100;
                            }
                            if(request.billingCurrencyNode == 1) {
                                body.billingAmount = body.billingAmount * 10;
                                body.memoCreditAmount = body.memoCreditAmount * 10;
                                body.memoDebitAmount = body.memoDebitAmount * 10;
                            }
                
                            if(request.billingCurrencyNode == 0) {
                                body.billingAmount = body.billingAmount * 1;
                                body.memoCreditAmount = body.memoCreditAmount * 1;
                                body.memoDebitAmount = body.memoDebitAmount * 1;
                            }  
                            messageResponse.messageId = request.messageId;
                            messageResponse.validationResponse = "OK";
                            messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(body.billingAmount);
                            messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(body.memoDebitAmount);
                            messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
                            console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                            console.log("==========FINAL A AUTH==============");                
                            response.status(200).send(messageResponse);
                        } else if(authResponse2.authResponse == '05'){
                            var nuevoMemoDebitAmount = Number(body.memoDebitAmount) + request.billingAmount;
        
                            transaction.billingAmount = request.billingAmount;
                            transaction.messageId = request.messageId;
                            var arrayTransactions = JSON.parse(body.transactions);
                            arrayTransactions.push(transaction);
                        
                            actualizarSaldo({idCustomer: body.idCustomer, newMemoDebit: nuevoMemoDebitAmount, newTransaction: JSON.stringify(arrayTransactions)});
            
                            if(request.billingCurrencyNode == 2) {
                                body.billingAmount = body.billingAmount * 100;
                                body.memoCreditAmount = body.memoCreditAmount * 100;
                                nuevoMemoDebitAmount = nuevoMemoDebitAmount * 100;
                            }
                            if(request.billingCurrencyNode == 1) {
                                body.billingAmount = body.billingAmount * 10;
                                body.memoCreditAmount = body.memoCreditAmount * 10;
                                nuevoMemoDebitAmount = nuevoMemoDebitAmount * 10;
                            }
                
                            if(request.billingCurrencyNode == 0) {
                                body.billingAmount = body.billingAmount * 1;
                                body.memoCreditAmount = body.memoCreditAmount * 1;
                                nuevoMemoDebitAmount = nuevoMemoDebitAmount * 1;
                            }  
            
                            messageResponse.messageId = request.messageId;
                            messageResponse.validationResponse = "OK";
                            messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(body.billingAmount);
                            messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(nuevoMemoDebitAmount);
                            messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
                            console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                            console.log("==========FINAL A AUTH==============");                
                            response.status(200).send(messageResponse);
                        } else if(authResponse2.authResponse == '') {
                            var nuevoMemoDebitAmount = Number(body.memoDebitAmount) + request.billingAmount;
        
                            transaction.billingAmount = request.billingAmount;
                            transaction.messageId = request.messageId;
                            var arrayTransactions = JSON.parse(body.transactions);
                            arrayTransactions.push(transaction);
                        
                            actualizarSaldo({idCustomer: body.idCustomer, newMemoDebit: nuevoMemoDebitAmount, newTransaction: JSON.stringify(arrayTransactions)});
            
                            if(request.billingCurrencyNode == 2) {
                                body.billingAmount = body.billingAmount * 100;
                                body.memoCreditAmount = body.memoCreditAmount * 100;
                                nuevoMemoDebitAmount = nuevoMemoDebitAmount * 100;
                            }
                            if(request.billingCurrencyNode == 1) {
                                body.billingAmount = body.billingAmount * 10;
                                body.memoCreditAmount = body.memoCreditAmount * 10;
                                nuevoMemoDebitAmount = nuevoMemoDebitAmount * 10;
                            }
                
                            if(request.billingCurrencyNode == 0) {
                                body.billingAmount = body.billingAmount * 1;
                                body.memoCreditAmount = body.memoCreditAmount * 1;
                                nuevoMemoDebitAmount = nuevoMemoDebitAmount * 1;
                            }  
            
                            messageResponse.messageId = request.messageId;
                            messageResponse.validationResponse = "OK";
                            messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(body.billingAmount);
                            messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(nuevoMemoDebitAmount);
                            messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
                            console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                            console.log("==========FINAL A AUTH==============");                
                            response.status(200).send(messageResponse);
                        }
                    } else {
                        arrayTransactions.forEach(element => {
                            if(element.authResponse == '00') {
                                authResponse2.authResponse =  element.authResponse;
                            }else if(element.authResponse == '05'){
                                authResponse2.authResponse = '05';
                            } else {
                                authResponse2.authResponse = '';
                            }
                        });                                                            
                        
                        if(authResponse2.authResponse == '00') {
                            var nuevoMemoDebitAmount = Number(body.memoDebitAmount) + request.billingAmount;
        
                            transaction.billingAmount = request.billingAmount;
                            transaction.messageId = request.messageId;
                            var arrayTransactions = JSON.parse(body.transactions);
                            arrayTransactions.push(transaction);
                        
                            actualizarSaldo({idCustomer: body.idCustomer, newMemoDebit: nuevoMemoDebitAmount, newTransaction: JSON.stringify(arrayTransactions)});
            
                            if(request.billingCurrencyNode == 2) {
                                body.billingAmount = body.billingAmount * 100;
                                body.memoCreditAmount = body.memoCreditAmount * 100;
                                nuevoMemoDebitAmount = nuevoMemoDebitAmount * 100;
                            }
                            if(request.billingCurrencyNode == 1) {
                                body.billingAmount = body.billingAmount * 10;
                                body.memoCreditAmount = body.memoCreditAmount * 10;
                                nuevoMemoDebitAmount = nuevoMemoDebitAmount * 10;
                            }
                
                            if(request.billingCurrencyNode == 0) {
                                body.billingAmount = body.billingAmount * 1;
                                body.memoCreditAmount = body.memoCreditAmount * 1;
                                nuevoMemoDebitAmount = nuevoMemoDebitAmount * 1;
                            }  
            
                            messageResponse.messageId = request.messageId;
                            messageResponse.validationResponse = "OK";
                            messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(body.billingAmount);
                            messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(nuevoMemoDebitAmount);
                            messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
                            console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                            console.log("==========FINAL A AUTH==============");                
                            response.status(200).send(messageResponse);
                        } else if(authResponse2.authResponse == '05') {
                            if(request.billingCurrencyNode == 2) {
                                body.billingAmount = body.billingAmount * 100;
                                body.memoCreditAmount = body.memoCreditAmount * 100;
                                body.memoDebitAmount = body.memoDebitAmount * 100;
                            }
                            if(request.billingCurrencyNode == 1) {
                                body.billingAmount = body.billingAmount * 10;
                                body.memoCreditAmount = body.memoCreditAmount * 10;
                                body.memoDebitAmount = body.memoDebitAmount * 10;
                            }
                
                            if(request.billingCurrencyNode == 0) {
                                body.billingAmount = body.billingAmount * 1;
                                body.memoCreditAmount = body.memoCreditAmount * 1;
                                body.memoDebitAmount = body.memoDebitAmount * 1;
                            }  
            
                            messageResponse.messageId = request.messageId;
                            messageResponse.validationResponse = "OK";
                            messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(body.billingAmount);
                            messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(body.memoDebitAmount);
                            messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
                            console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                            console.log("==========FINAL A AUTH==============");                
                            response.status(200).send(messageResponse);
                        } else if(authResponse2.authResponse == '') {
                            if(request.billingCurrencyNode == 2) {
                                body.billingAmount = body.billingAmount * 100;
                                body.memoCreditAmount = body.memoCreditAmount * 100;
                                body.memoDebitAmount = body.memoDebitAmount * 100;
                            }
                            if(request.billingCurrencyNode == 1) {
                                body.billingAmount = body.billingAmount * 10;
                                body.memoCreditAmount = body.memoCreditAmount * 10;
                                body.memoDebitAmount = body.memoDebitAmount * 10;
                            }
                
                            if(request.billingCurrencyNode == 0) {
                                body.billingAmount = body.billingAmount * 1;
                                body.memoCreditAmount = body.memoCreditAmount * 1;
                                body.memoDebitAmount = body.memoDebitAmount * 1;
                            }  
            
                            messageResponse.messageId = request.messageId;
                            messageResponse.validationResponse = "OK";
                            messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(body.billingAmount);
                            messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(body.memoDebitAmount);
                            messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
                            console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                            console.log("==========FINAL A AUTH==============");                
                            response.status(200).send(messageResponse);
                        }
                    }

                } else {
                    var arrayTransactions = JSON.parse(body.transactions);

                    var authResponse2 = {
                        authResponse: ''
                    }

                    if(request.authResponse == '00') {

                        arrayTransactions.forEach(element => {
                            if(element.authResponse == '00') {
                                authResponse2.authResponse =  element.authResponse;
                            }else if(element.authResponse == '05'){
                                authResponse2.authResponse = '05';
                            } else {
                                authResponse2.authResponse = '';
                            }
                        });                                                            
                        
                        if(authResponse2.authResponse == '00') {
                            
                            var nuevoSaldo = Number(body.billingAmount) - Number(request.billingAmount);
                            
                            actualizarSaldo({idCustomer: body.idCustomer, newBalance: nuevoSaldo == 0 ? 0.01 : nuevoSaldo, newTransaction: JSON.stringify(arrayTransactions)});
                            
                            if(request.billingCurrencyNode == 2) {
                                nuevoSaldo = nuevoSaldo * 100;
                                nuevoMemoDebitAmount = nuevoMemoDebitAmount * 100;
                                body.memoCreditAmount = body.memoCreditAmount * 100;
                            }
                            if(request.billingCurrencyNode == 1) {
                                nuevoSaldo = nuevoSaldo * 10;
                                nuevoMemoDebitAmount = nuevoMemoDebitAmount * 10;
                                body.memoCreditAmount = body.memoCreditAmount * 10;
                            }

                            if(request.billingCurrencyNode == 0) {
                                nuevoSaldo = nuevoSaldo * 1;
                                nuevoMemoDebitAmount = nuevoMemoDebitAmount * 1;
                                body.memoCreditAmount = body.memoCreditAmount * 1;
                            }
                
                            messageResponse.messageId = request.messageId;
                            messageResponse.validationResponse = "OK";
                            messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(nuevoSaldo);
                            messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(nuevoMemoDebitAmount);
                            messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
                            console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                            console.log("==========FINAL A AUTH==============");                
                            response.status(200).send(messageResponse);

                        } else if(authResponse2.authResponse == '05'){
                            var nuevoMemoDebitAmount = Number(body.memoDebitAmount) + request.billingAmount;
        
                            transaction.billingAmount = request.billingAmount;
                            transaction.messageId = request.messageId;
                            var arrayTransactions = JSON.parse(body.transactions);
                            arrayTransactions.push(transaction);
                        
                            actualizarSaldo({idCustomer: body.idCustomer, newMemoDebit: nuevoMemoDebitAmount, newTransaction: JSON.stringify(arrayTransactions)});
            
                            if(request.billingCurrencyNode == 2) {
                                body.billingAmount = body.billingAmount * 100;
                                body.memoCreditAmount = body.memoCreditAmount * 100;
                                nuevoMemoDebitAmount = nuevoMemoDebitAmount * 100;
                            }
                            if(request.billingCurrencyNode == 1) {
                                body.billingAmount = body.billingAmount * 10;
                                body.memoCreditAmount = body.memoCreditAmount * 10;
                                nuevoMemoDebitAmount = nuevoMemoDebitAmount * 10;
                            }
                
                            if(request.billingCurrencyNode == 0) {
                                body.billingAmount = body.billingAmount * 1;
                                body.memoCreditAmount = body.memoCreditAmount * 1;
                                nuevoMemoDebitAmount = nuevoMemoDebitAmount * 1;
                            }  
            
                            messageResponse.messageId = request.messageId;
                            messageResponse.validationResponse = "OK";
                            messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(body.billingAmount);
                            messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(nuevoMemoDebitAmount);
                            messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
                            console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                            console.log("==========FINAL A AUTH==============");                
                            response.status(200).send(messageResponse);
                        } else if(authResponse2.authResponse == '') {
                            var nuevoSaldo = Number(body.billingAmount) - Number(request.billingAmount);
                            
                            actualizarSaldo({idCustomer: body.idCustomer, newBalance: nuevoSaldo == 0 ? 0.01 : nuevoSaldo, newTransaction: JSON.stringify(arrayTransactions)});
                            
                            if(request.billingCurrencyNode == 2) {
                                nuevoSaldo = nuevoSaldo * 100;
                                body.memoDebitAmount = body.memoDebitAmount * 100;
                                body.memoCreditAmount = body.memoCreditAmount * 100;
                            }
                            if(request.billingCurrencyNode == 1) {
                                nuevoSaldo = nuevoSaldo * 10;
                                body.memoDebitAmount = body.memoDebitAmount * 10;
                                body.memoCreditAmount = body.memoCreditAmount * 10;
                            }

                            if(request.billingCurrencyNode == 0) {
                                nuevoSaldo = nuevoSaldo * 1;
                                body.memoDebitAmount = body.memoDebitAmount * 1;
                                body.memoCreditAmount = body.memoCreditAmount * 1;
                            }
                
                            messageResponse.messageId = request.messageId;
                            messageResponse.validationResponse = "OK";
                            messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(nuevoSaldo);
                            messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(body.memoDebitAmount);
                            messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
                            console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                            console.log("==========FINAL A AUTH==============");                
                            response.status(200).send(messageResponse);
                        }
                    } else if(request.authResponse == '05'){
                    
                        var nuevoBalance = Number(body.billingAmount) + request.billingAmount;
        
                            transaction.billingAmount = request.billingAmount;
                            transaction.messageId = request.messageId;
                            var arrayTransactions = JSON.parse(body.transactions);
                            arrayTransactions.push(transaction);
                        
                            actualizarSaldo({idCustomer: body.idCustomer, newBalance: nuevoBalance, newTransaction: JSON.stringify(arrayTransactions)});
            
                            if(request.billingCurrencyNode == 2) {
                                nuevoBalance = nuevoBalance * 100;
                                body.memoCreditAmount = body.memoCreditAmount * 100;
                                body.memoDebitAmount = body.memoDebitAmount * 100;
                            }
                            if(request.billingCurrencyNode == 1) {
                                nuevoBalance = nuevoBalance * 10;
                                body.memoCreditAmount = body.memoCreditAmount * 10;
                                body.memoDebitAmount = body.memoDebitAmount * 10;
                            }
                
                            if(request.billingCurrencyNode == 0) {
                                nuevoBalance = nuevoBalance * 1;
                                body.memoCreditAmount = body.memoCreditAmount * 1;
                                body.memoDebitAmount = body.memoDebitAmount * 1;
                            }  
            
                            messageResponse.messageId = request.messageId;
                            messageResponse.validationResponse = "OK";
                            messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(nuevoBalance);
                            messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(body.memoDebitAmount);
                            messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
                            console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                            console.log("==========FINAL A AUTH==============");                
                            response.status(200).send(messageResponse);

                    } else {
                        arrayTransactions.forEach(element => {
                            if(element.authResponse == '00') {
                                authResponse2.authResponse =  element.authResponse;
                            }else if(element.authResponse == '05'){
                                authResponse2.authResponse = '05';
                            } else {
                                authResponse2.authResponse = '';
                            }
                        });                                                            
                        
                        if(authResponse2.authResponse == '00') {
                            var nuevoMemoDebitAmount = Number(body.memoDebitAmount) + request.billingAmount;
        
                            transaction.billingAmount = request.billingAmount;
                            transaction.messageId = request.messageId;
                            var arrayTransactions = JSON.parse(body.transactions);
                            arrayTransactions.push(transaction);
                        
                            actualizarSaldo({idCustomer: body.idCustomer, newMemoDebit: nuevoMemoDebitAmount, newTransaction: JSON.stringify(arrayTransactions)});
            
                            if(request.billingCurrencyNode == 2) {
                                body.billingAmount = body.billingAmount * 100;
                                body.memoCreditAmount = body.memoCreditAmount * 100;
                                nuevoMemoDebitAmount = nuevoMemoDebitAmount * 100;
                            }
                            if(request.billingCurrencyNode == 1) {
                                body.billingAmount = body.billingAmount * 10;
                                body.memoCreditAmount = body.memoCreditAmount * 10;
                                nuevoMemoDebitAmount = nuevoMemoDebitAmount * 10;
                            }
                
                            if(request.billingCurrencyNode == 0) {
                                body.billingAmount = body.billingAmount * 1;
                                body.memoCreditAmount = body.memoCreditAmount * 1;
                                nuevoMemoDebitAmount = nuevoMemoDebitAmount * 1;
                            }  
            
                            messageResponse.messageId = request.messageId;
                            messageResponse.validationResponse = "OK";
                            messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(body.billingAmount);
                            messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(nuevoMemoDebitAmount);
                            messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
                            console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                            console.log("==========FINAL A AUTH==============");                
                            response.status(200).send(messageResponse);
                        } else if(authResponse2.authResponse == '05') {
                            if(request.billingCurrencyNode == 2) {
                                body.billingAmount = body.billingAmount * 100;
                                body.memoCreditAmount = body.memoCreditAmount * 100;
                                body.memoDebitAmount = body.memoDebitAmount * 100;
                            }
                            if(request.billingCurrencyNode == 1) {
                                body.billingAmount = body.billingAmount * 10;
                                body.memoCreditAmount = body.memoCreditAmount * 10;
                                body.memoDebitAmount = body.memoDebitAmount * 10;
                            }
                
                            if(request.billingCurrencyNode == 0) {
                                body.billingAmount = body.billingAmount * 1;
                                body.memoCreditAmount = body.memoCreditAmount * 1;
                                body.memoDebitAmount = body.memoDebitAmount * 1;
                            }  
            
                            messageResponse.messageId = request.messageId;
                            messageResponse.validationResponse = "OK";
                            messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(body.billingAmount);
                            messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(body.memoDebitAmount);
                            messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
                            console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                            console.log("==========FINAL A AUTH==============");                
                            response.status(200).send(messageResponse);
                        } else if(authResponse2.authResponse == '') {
                            if(request.billingCurrencyNode == 2) {
                                body.billingAmount = body.billingAmount * 100;
                                body.memoCreditAmount = body.memoCreditAmount * 100;
                                body.memoDebitAmount = body.memoDebitAmount * 100;
                            }
                            if(request.billingCurrencyNode == 1) {
                                body.billingAmount = body.billingAmount * 10;
                                body.memoCreditAmount = body.memoCreditAmount * 10;
                                body.memoDebitAmount = body.memoDebitAmount * 10;
                            }
                
                            if(request.billingCurrencyNode == 0) {
                                body.billingAmount = body.billingAmount * 1;
                                body.memoCreditAmount = body.memoCreditAmount * 1;
                                body.memoDebitAmount = body.memoDebitAmount * 1;
                            }  
            
                            messageResponse.messageId = request.messageId;
                            messageResponse.validationResponse = "OK";
                            messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(body.billingAmount);
                            messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(body.memoDebitAmount);
                            messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
                            console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                            console.log("==========FINAL A AUTH==============");                
                            response.status(200).send(messageResponse);
                        }
                    }
                }
                                  
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

app.post('/app/setTimeOut', (request, response) => {   
    response.send("BODY: " + request.body.time);
});

app.get('/app/setTimeOut', (request, response) => {    
    setTimeout(() => {
        response.send(true);
    }, 55000);
});

app.post('/generateZip/v1', (request, response) => {

    createZipFromBase64Images(request.body)
    .then(zipBase64 => {
        //console.log('Archivo .zip en base64:', zipBase64);        
        response.status(200).send({"statusCode": 200, "body": {"base64": zipBase64}});
    })
    .catch(err => {
        console.error('Error:', err);
    });
});

app.post('/validateDocuments/v1', (request, response) => {
    
    var body = request;

    const axios = require('axios');
    // let data = JSON.stringify({
    //     "uuid": body.uuid
    // });

    console.log("BODY: " + JSON.parse(body));
    let data = JSON.parse(body);

    let config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: 'https://pb7isqlfp4.execute-api.us-east-1.amazonaws.com/Produccion/resultadogenerado',
        headers: { 
            'Content-type': 'application/json'
        },
        data : data
    };



    async function makeRequest() {
    try {
        const res = await axios.request(config);
        var parseJson = JSON.stringify(res.data);
        var respDoc = JSON.parse(parseJson);
        if(respDoc.body.estatus != 'Procesado' && respDoc.body.resultado != 'Procesado') {
            //console.log("ENTRASTE 1");
            response.send(respDoc);
        } else {
            response.send(respDoc);
        }        
    }
    catch (error) {
        console.log(error);
    }
    }
    makeRequest();
    
});

async function createZipFromBase64Images(base64Images) {
    const zip = new JSZip();    

    base64Images.map(item => {       
        const buffer = Buffer.from(item.data, 'base64');
        zip.file(item.filename, buffer);
    }); 

    // Generar el archivo zip
    const zipContent = await zip.generateAsync({ type: 'nodebuffer' });    
    const outputZipPath = path.join(__dirname, 'output', 'files.zip');

    // Crear la carpeta de salida si no existe
    if (!fs.existsSync(path.dirname(outputZipPath))) {
        fs.mkdirSync(path.dirname(outputZipPath), { recursive: true });
    }

    fs.writeFileSync(outputZipPath, zipContent);

    // Convertir el archivo zip a base64
    const zipBase64 = zipContent.toString('base64');
    
    return zipBase64;
}

app.listen(process.env.PORT || 5000, () => {
    console.log(`App listening on port ${port}`);
});