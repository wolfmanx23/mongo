/**
 * Copyright 2021 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the “License”);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *  https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an “AS IS” BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Add the express web framework
const express = require("express");
const fs = require("fs");
const app = express();

// Use body-parser to handle the PUT data
const bodyParser = require("body-parser");
app.use(
    bodyParser.urlencoded({
        extended: false
    })
);

// Then we'll pull in the database client library
const MongoClient = require("mongodb").MongoClient;

// Util is handy to have around, so thats why that's here.
const util = require('util');
// and so is assert
const assert = require('assert');


let credentials;

// Retrieve the Kubernetes environment variables from BINDING in the clouddb-deployment.yaml file
// Check to make sure that the BINDING environment variable is present
// If it's not present, then it will throw an error
if (!process.env.BINDING) {
 console.error('ENVIRONMENT variable "BINDING" is not set!');
 process.exit(1);
} else {
    credentials = JSON.parse(process.env.BINDING);
    console.log('Credenciales ' + credentials);
}

assert(!util.isUndefined(credentials), "Must be bound to IBM Kubernetes Cluster");

// We now take the first bound MongoDB service and extract its credentials object from BINDING
let mongodbConn = credentials.connection.mongodb;

// Read the CA certificate and assign that to the CA variable
let ca = [Buffer.from(mongodbConn.certificate.certificate_base64, 'base64')];

// We always want to make a validated TLS/SSL connection
let options = {
    ssl: true,
    sslValidate: true,
    sslCA: ca
};
// Extract the database username and password
let authentication = mongodbConn.authentication;
let username = authentication.username;
let password = authentication.password;

// Extract the MongoDB URIs
let connectionPath = mongodbConn.hosts;
let connectionString = `mongodb://${username}:${password}@${connectionPath[0].hostname}:${connectionPath[0].port},${connectionPath[1].hostname}:${connectionPath[1].port}/?replicaSet=replset`;


// We want to extract the port to publish our app on
let port = 8080;

// This is a global variable we'll use for handing the MongoDB client around
let mongodb;
if (process.env.DASH_BINDING) {
    console.log(JSON.stringify(JSON.parse(process.env.DASH_BINDING)));
}

console.log("mongo");
console.log(connectionString);
// This is the MongoDB connection. From the application environment, we got the
// credentials and the credentials contain a URI for the database. Here, we
// connect to that URI, and also pass a number of SSL settings to the
// call. Among those SSL settings is the SSL CA, into which we pass the array
// wrapped and now decoded ca_certificate_base64,
MongoClient.connect(connectionString, options, function (err, db) {
    // Here we handle the async response. This is a simple example and
    // we're not going to inject the database connection into the
    // middleware, just save it in a global variable, as long as there
    // isn't an error.
    if (err) {
        console.log(err);
    } else {
        // Although we have a connection, it's to the "admin" database
        // of MongoDB deployment. In this example, we want the
        // "examples" database so what we do here is create that
        // connection using the current connection.
        mongodb = db.db("examples");
        console.log("connection successfull");
    }
});


// Listen for a connection.
app.listen(port, function () {
    console.log("Server is listening on port " + port);
});
