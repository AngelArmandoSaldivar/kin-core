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

            if(request.financial_institution_id != body.financial_instituto_id) {
                console.log("ENTRASTE 1");
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
        
            /**
             * VALIDAR SI EL ID DE MENSAJE ES IGUAL AL ID DE MENSAJE EN NETSUITE
             * SE DEBE GUARDAR ESE ID DE MENSAJE EN NETSUITE PARA IDENTIFICAR LAS TRANSACCIONES TIPO AUTH_ONLY 
             * PARA DESPUES HACER UN DESCUENTO EN EL LIMITE DEL CREDITO CON FINANCIAL
             * 
             * Ejemplo: Limite credito 1000
             * AUTH_ONLY = 100 TIPO DEBIT - MEMO_DEBIT_AMOUNT = 100
             * 
             * SEGUNDO MENSAJE VALIDAR EL ID DE MENSAJE Y DESCONTAR DEL LIMITE DE CREDITO DEL MEMO_DEBIT_AMOUNT
             * EL LIMITE DE CREDITO SERIA 900 Y EL MEMO_DEBIT_AMOUNT = 0
             */

            var transaction = {
                "messageId": "",
                "billingAmount": 0
            }

           
            if (request.messageSubType == 'AUTH_ONLY' && request.creditDebitFlag == 'D' && (request.messageTypeId == 'ADVICE' || request.messageTypeId == 'AUTH')) {
                
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

            } else if(request.messageSubType == 'AUTH_ONLY' && request.creditDebitFlag == 'C' && (request.messageTypeId == 'ADVICE' || request.messageTypeId == 'AUTH')){
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

                if(foundItem) {                    

                    arrayTransactions = arrayTransactions.filter(item => item.messageId !== request.originalMessageId);                    
                    var nuevoSaldo = Number(body.billingAmount) - Number(foundItem.billingAmount);
                    var nuevoMemoDebitAmount = Number(body.memoDebitAmount) - Number(foundItem.billingAmount);
                    
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
        
                    messageResponse.messageId = request.messageId;
                    messageResponse.validationResponse = "OK";
                    messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(nuevoSaldo);
                    messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(nuevoMemoDebitAmount);
                    messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
                    console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                    console.log("==========FINAL A AUTH==============");                
                    response.status(200).send(messageResponse);

                } else {
                    response.send("No existe");
                }
                
            } else if(request.messageSubType == 'FINANCIAL' && request.creditDebitFlag == 'C' && request.originalMessageId != undefined) {

                transaction.billingAmount = request.billingAmount;
                transaction.messageId = request.originalMessageId;
                var arrayTransactions = JSON.parse(body.transactions);

                //Busqueda y eliminación

                var foundItem = arrayTransactions.find(item => item.messageId === request.originalMessageId);

                if(foundItem) {                    

                    arrayTransactions = arrayTransactions.filter(item => item.messageId !== request.originalMessageId);
                    var nuevoSaldo = Number(body.billingAmount) - Number(foundItem.billingAmount);
                    var nuevoMemoCreditAmount = Number(body.memoCreditAmount) - Number(foundItem.billingAmount);

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
                    response.send("No se encuentra la transaccion")
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

            /*var nuevoSaldo = body.billingAmount - request.billingAmount;

            if(calculoTiempoRespuesta(startHrTime) > 3) {
                messageResponse.messageId = request.messageId;
                messageResponse.validationResponse = "OK";
                messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(nuevoSaldo);
                messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(body.memoDebitAmount);
                messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
                console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                console.log("==========FINAL A AUTH==============");
                response.status(200).send(messageResponse);
            }        

            actualizarSaldo({idCustomer: body.idCustomer, newBalance: nuevoSaldo == 0 ? 0.01 : nuevoSaldo, type: 'AUTH'});

            if(request.billingCurrencyNode == 2) {                        
                nuevoSaldo = nuevoSaldo * 100;
            }
            if(request.billingCurrencyNode == 1) {
                nuevoSaldo = nuevoSaldo * 10;
            }

            if(request.billingCurrencyNode == 0) {
                nuevoSaldo = nuevoSaldo * 1;
            }                    

            messageResponse.messageId = request.messageId;
            messageResponse.validationResponse = "OK";
            messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(nuevoSaldo);
            messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(body.memoDebitAmount);
            messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
            console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
            console.log("==========FINAL A AUTH==============");                
            response.status(200).send(messageResponse);*/
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
            
            var estatusCuenta = body.estatusCuenta;

            if(estatusCuenta == "Pickup") {
                messageResponse2.messageId = request.messageId;
                messageResponse2.validationResponse = "CORE_BANK_DECLINED";
                messageResponse2.serviceResponseFields.ACCOUNT_BALANCE = body.billingAmount;
                messageResponse2.serviceResponseFields.MEMO_DEBIT_AMOUNT = body.memoDebitAmount;
                messageResponse2.serviceResponseFields.MEMO_CREDIT_AMOUNT = body.memoCreditAmount;
                messageResponse2.serviceResponseFields.ACCT_BLOCK_CODE = 0;
                messageResponse2.serviceResponseFields.CORE_BANK_DEC_REASON_CODE = 2
                response.status(200).send(messageResponse2);
            }

            if(estatusCuenta == "Fraude") {
                messageResponse2.messageId = request.messageId;
                messageResponse2.validationResponse = "CORE_BANK_DECLINED";
                messageResponse2.serviceResponseFields.ACCOUNT_BALANCE = body.billingAmount;
                messageResponse2.serviceResponseFields.MEMO_DEBIT_AMOUNT = body.memoDebitAmount;
                messageResponse2.serviceResponseFields.MEMO_CREDIT_AMOUNT = body.memoCreditAmount;
                messageResponse2.serviceResponseFields.ACCT_BLOCK_CODE = 0;
                messageResponse2.serviceResponseFields.CORE_BANK_DEC_REASON_CODE = 3;
                response.status(200).send(messageResponse2);
            }

            if(estatusCuenta == "Sospecha Fraude") {
                messageResponse2.messageId = request.messageId;
                messageResponse2.validationResponse = "CORE_BANK_DECLINED";
                messageResponse2.serviceResponseFields.ACCOUNT_BALANCE = body.billingAmount;
                messageResponse2.serviceResponseFields.MEMO_DEBIT_AMOUNT = body.memoDebitAmount;
                messageResponse2.serviceResponseFields.MEMO_CREDIT_AMOUNT = body.memoCreditAmount;
                messageResponse2.serviceResponseFields.ACCT_BLOCK_CODE = 0;
                messageResponse2.serviceResponseFields.CORE_BANK_DEC_REASON_CODE = 4;
                response.status(200).send(messageResponse2);
            }

             if(estatusCuenta == "Temporal") {
                messageResponse2.messageId = request.messageId;
                messageResponse2.validationResponse = "CORE_BANK_DECLINED";
                messageResponse2.serviceResponseFields.ACCOUNT_BALANCE = body.billingAmount;
                messageResponse2.serviceResponseFields.MEMO_DEBIT_AMOUNT = body.memoDebitAmount;
                messageResponse2.serviceResponseFields.MEMO_CREDIT_AMOUNT = body.memoCreditAmount;
                messageResponse2.serviceResponseFields.ACCT_BLOCK_CODE = 0;
                messageResponse2.serviceResponseFields.CORE_BANK_DEC_REASON_CODE = 5
                response.status(200).send(messageResponse2);
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
                   
                if (request.messageSubType == 'AUTH_ONLY' && request.creditDebitFlag == 'D' && (request.messageTypeId == 'ADVICE' || request.messageTypeId == 'AUTH')) {
                    
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
    
                } else if(request.messageSubType == 'AUTH_ONLY' && request.creditDebitFlag == 'C' && (request.messageTypeId == 'ADVICE' || request.messageTypeId == 'AUTH')){
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
    
                    if(foundItem) {                    
    
                        arrayTransactions = arrayTransactions.filter(item => item.messageId !== request.originalMessageId);                    
                        var nuevoSaldo = Number(body.billingAmount) + Number(foundItem.billingAmount);
                        var nuevoMemoDebitAmount = Number(body.memoDebitAmount) - Number(foundItem.billingAmount);
                        
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
            
                        messageResponse.messageId = request.messageId;
                        messageResponse.validationResponse = "OK";
                        messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(nuevoSaldo);
                        messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(nuevoMemoDebitAmount);
                        messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
                        console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                        console.log("==========FINAL A AUTH==============");                
                        response.status(200).send(messageResponse);
    
                    } else {
                        response.send("No existe");
                    }
                    
                } else if(request.messageSubType == 'FINANCIAL' && request.creditDebitFlag == 'C' && request.originalMessageId != undefined) {
    
                    transaction.billingAmount = request.billingAmount;
                    transaction.messageId = request.originalMessageId;
                    var arrayTransactions = JSON.parse(body.transactions);
    
                    //Busqueda y eliminación
    
                    var foundItem = arrayTransactions.find(item => item.messageId === request.originalMessageId);
    
                    if(foundItem) {                    
    
                        arrayTransactions = arrayTransactions.filter(item => item.messageId !== request.originalMessageId);
                        var nuevoSaldo = Number(body.billingAmount) + Number(foundItem.billingAmount);
                        var nuevoMemoCreditAmount = Number(body.memoCreditAmount) - Number(foundItem.billingAmount);
    
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
                        response.send("No se encuentra la transaccion")
                    }             
                } else if(request.messageSubType == 'FINANCIAL' && request.originalMessageId == undefined && (request.creditDebitFlag == 'C' || request.creditDebitFlag == 'D')) {
                        
                    var nuevoSaldo = Number(body.billingAmount) + Number(request.billingAmount);                
    
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
                
                // var nuevoSaldo = body.billingAmount + request.billingAmount;
                
                // if (request.reversalReason[0] == 'TIME_OUT') {

                //     console.log("ENTRASTE A TIME OUT");

                //     if(request.billingCurrencyNode == 2) {                        
                //         body.billingAmount = body.billingAmount * 100;
                //     }
                //     if(request.billingCurrencyNode == 1) {
                //         body.billingAmount = body.billingAmount * 10;
                //     }
        
                //     if(request.billingCurrencyNode == 0) {
                //         body.billingAmount = body.billingAmount * 1;
                //     }

                //     messageResponse.messageId = request.messageId;
                //     messageResponse.validationResponse = "OK";
                //     messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(body.billingAmount);
                //     messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(body.memoDebitAmount);
                //     messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
                //     console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                //     console.log("==========FINAL A REVERSAL==============");
                //     response.status(200).send(messageResponse);
                // }
                            
                // if (nuevoSaldo <= body.memoDebitAmount && request.reversalReason[0] != 'TIME_OUT') {     
                    
                //     actualizarSaldo({idCustomer: body.idCustomer, newBalance: nuevoSaldo, type: 'REVERSAL'});

                //     if(request.billingCurrencyNode == 2) {                        
                //         nuevoSaldo = nuevoSaldo * 100;
                //     }
                //     if(request.billingCurrencyNode == 1) {
                //         nuevoSaldo = nuevoSaldo * 10;
                //     }
        
                //     if(request.billingCurrencyNode == 0) {
                //         nuevoSaldo = nuevoSaldo * 1;
                //     }

                //     messageResponse.messageId = request.messageId;
                //     messageResponse.validationResponse = "OK";
                //     messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(nuevoSaldo);
                //     messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(body.memoDebitAmount);
                //     messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);                   
                //     response.status(200).send(messageResponse);
                // } else {
                //     console.log("ENTRASTE A ELSE");
                //     if (request.reversalReason[0] != 'TIME_OUT') {

                //         if(request.billingCurrencyNode == 2) {                        
                //             body.billingAmount = body.billingAmount * 100;
                //         }
                //         if(request.billingCurrencyNode == 1) {
                //             body.billingAmount = body.billingAmount * 10;
                //         }
            
                //         if(request.billingCurrencyNode == 0) {
                //             body.billingAmount = body.billingAmount * 1;
                //         }
                        
                //         messageResponse.messageId = request.messageId;
                //         messageResponse.validationResponse = "OK";
                //         messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(body.billingAmount);
                //         messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(body.memoDebitAmount);
                //         messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
                //         console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                //         console.log("==========FINAL A REVERSAL==============");
                //         response.status(200).send(messageResponse);               
                //     }
                // }                
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

    const startHrTime = process.hrtime();

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

    myInvoices.get({type: 'REVERSAL'}, function(error, body)
    {      
        try {

            body.billingAmount = Number(body.billingAmount);
            request.originalTxnAmount = Number(request.originalTxnAmount);
            body.memoDebitAmount = Number(body.memoDebitAmount);

            var estatusCuenta = body.estatusCuenta;

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

            if(estatusCuenta == "Bloqueada") {
                messageResponse.messageId = request.messageId;
                messageResponse.validationResponse = "BLK";
                messageResponse.serviceResponseFields.ACCOUNT_BALANCE = body.billingAmount;
                messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = body.memoDebitAmount;
                messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = body.memoCreditAmount;
                messageResponse.serviceResponseFields.ACCT_BLOCK_CODE = 0;
                response.status(200).send(messageResponse);
            }

            if(estatusCuenta == "Pickup") {
                messageResponse2.messageId = request.messageId;
                messageResponse2.validationResponse = "CORE_BANK_DECLINED";
                messageResponse2.serviceResponseFields.ACCOUNT_BALANCE = body.billingAmount;
                messageResponse2.serviceResponseFields.MEMO_DEBIT_AMOUNT = body.memoDebitAmount;
                messageResponse2.serviceResponseFields.MEMO_CREDIT_AMOUNT = body.memoCreditAmount;
                messageResponse2.serviceResponseFields.ACCT_BLOCK_CODE = 0;
                messageResponse2.serviceResponseFields.CORE_BANK_DEC_REASON_CODE = 2
                response.status(200).send(messageResponse2);
            }

            if(estatusCuenta == "Fraude") {
                messageResponse2.messageId = request.messageId;
                messageResponse2.validationResponse = "CORE_BANK_DECLINED";
                messageResponse2.serviceResponseFields.ACCOUNT_BALANCE = body.billingAmount;
                messageResponse2.serviceResponseFields.MEMO_DEBIT_AMOUNT = body.memoDebitAmount;
                messageResponse2.serviceResponseFields.MEMO_CREDIT_AMOUNT = body.memoCreditAmount;
                messageResponse2.serviceResponseFields.ACCT_BLOCK_CODE = 0;
                messageResponse2.serviceResponseFields.CORE_BANK_DEC_REASON_CODE = 3;
                response.status(200).send(messageResponse2);
            }

            if(estatusCuenta == "Sospecha Fraude") {
                messageResponse2.messageId = request.messageId;
                messageResponse2.validationResponse = "CORE_BANK_DECLINED";
                messageResponse2.serviceResponseFields.ACCOUNT_BALANCE = body.billingAmount;
                messageResponse2.serviceResponseFields.MEMO_DEBIT_AMOUNT = body.memoDebitAmount;
                messageResponse2.serviceResponseFields.MEMO_CREDIT_AMOUNT = body.memoCreditAmount;
                messageResponse2.serviceResponseFields.ACCT_BLOCK_CODE = 0;
                messageResponse2.serviceResponseFields.CORE_BANK_DEC_REASON_CODE = 4;
                response.status(200).send(messageResponse2);
            }

             if(estatusCuenta == "Temporal") {
                messageResponse2.messageId = request.messageId;
                messageResponse2.validationResponse = "CORE_BANK_DECLINED";
                messageResponse2.serviceResponseFields.ACCOUNT_BALANCE = body.billingAmount;
                messageResponse2.serviceResponseFields.MEMO_DEBIT_AMOUNT = body.memoDebitAmount;
                messageResponse2.serviceResponseFields.MEMO_CREDIT_AMOUNT = body.memoCreditAmount;
                messageResponse2.serviceResponseFields.ACCT_BLOCK_CODE = 0;
                messageResponse2.serviceResponseFields.CORE_BANK_DEC_REASON_CODE = 5
                response.status(200).send(messageResponse2);
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
    
                } else if(request.messageSubType == 'FINANCIAL' && request.creditDebitFlag == 'D' && request.originalMessageId != undefined) {
    
                    transaction.billingAmount = request.billingAmount;
                    transaction.messageId = request.originalMessageId;
                    var arrayTransactions = JSON.parse(body.transactions);
    
                    //Busqueda y eliminación
    
                    var foundItem = arrayTransactions.find(item => item.messageId === request.originalMessageId);
    
                    if(foundItem) {                    
    
                        arrayTransactions = arrayTransactions.filter(item => item.messageId !== request.originalMessageId);                    
                        var nuevoSaldo = Number(body.billingAmount) - Number(foundItem.billingAmount);
                        var nuevoMemoDebitAmount = Number(body.memoDebitAmount) - Number(foundItem.billingAmount);
                        
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
            
                        messageResponse.messageId = request.messageId;
                        messageResponse.validationResponse = "OK";
                        messageResponse.serviceResponseFields.ACCOUNT_BALANCE = Number(nuevoSaldo);
                        messageResponse.serviceResponseFields.MEMO_DEBIT_AMOUNT = Number(nuevoMemoDebitAmount);
                        messageResponse.serviceResponseFields.MEMO_CREDIT_AMOUNT = Number(body.memoCreditAmount);
                        console.log("Response Time " + calculoTiempoRespuesta(startHrTime) + 'ms');
                        console.log("==========FINAL A AUTH==============");                
                        response.status(200).send(messageResponse);
    
                    } else {
                        response.send("No existe");
                    }
                    
                } else if(request.messageSubType == 'FINANCIAL' && request.creditDebitFlag == 'C' && request.originalMessageId != undefined) {
    
                    transaction.billingAmount = request.billingAmount;
                    transaction.messageId = request.originalMessageId;
                    var arrayTransactions = JSON.parse(body.transactions);
    
                    //Busqueda y eliminación
    
                    var foundItem = arrayTransactions.find(item => item.messageId === request.originalMessageId);
    
                    if(foundItem) {                    
    
                        arrayTransactions = arrayTransactions.filter(item => item.messageId !== request.originalMessageId);
                        var nuevoSaldo = Number(body.billingAmount) - Number(foundItem.billingAmount);
                        var nuevoMemoCreditAmount = Number(body.memoCreditAmount) - Number(foundItem.billingAmount);
    
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
                        response.send("No se encuentra la transaccion")
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

app.listen(process.env.PORT || 5000, () => {
    console.log(`App listening on port ${port}`);
});