/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

// [START all]
// [START import]
// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');
const request = require("request");
const cheerio = require("cheerio");
const rp = require("request-promise");
// The Firebase Admin SDK to access the Firebase Realtime Database. 
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
// [END import]

/*
*/


// [START addMessage]
// Take the text parameter passed to this HTTP endpoint and insert it into the
// Realtime Database under the path /messages/:pushId/original
// [START addMessageTrigger]
exports.addMessage = functions.https.onRequest((req, res) => {
// [END addMessageTrigger]
  // Grab the text parameter.
  const original = req.query.text;
  // [START adminSdkPush]
  // Push the new message into the Realtime Database using the Firebase Admin SDK.
  admin.database().ref('/messages').push({original: original}).then(snapshot => {
    // Redirect with 303 SEE OTHER to the URL of the pushed object in the Firebase console.
    res.redirect(303, snapshot.ref);
  });
  // [END adminSdkPush]
});
// [END addMessage]

// [START makeUppercase]
// Listens for new messages added to /messages/:pushId/original and creates an
// uppercase version of the message to /messages/:pushId/uppercase
// [START makeUppercaseTrigger]
exports.makeUppercase = functions.database.ref('/messages/{pushId}/original')
    .onWrite(event => {
// [END makeUppercaseTrigger]
      // [START makeUppercaseBody]
      // Grab the current value of what was written to the Realtime Database.
      const original = event.data.val();
      console.log('Uppercasing', event.params.pushId, original);
      const uppercase = original.toUpperCase();
      // You must return a Promise when performing asynchronous tasks inside a Functions such as
      // writing to the Firebase Realtime Database.
      // Setting an "uppercase" sibling in the Realtime Database returns a Promise.
      return event.data.ref.parent.child('uppercase').set(uppercase);
      // [END makeUppercaseBody]
    });
// [END makeUppercase]
// [END all]

exports.makesearch = functions.database.ref('/user_data/googleid_example/search_string')
    .onWrite(event => {
// [END searchkeyTrigger]
      // [START searchkey]
      // Grab the current value of what was written to the Realtime Database.
      
      event.data.ref.parent.child('isFinish').set("False");      
      const searchkey = event.data.val();
      console.log("search for",searchkey);

      var options = {
	    uri: 'http://webpac.lib.ntpu.edu.tw/search.cfm?',
	    qs: {
	        m:"ss",
	        k0:searchkey,
	        t0:"k",
	        c0:"and",
	        list_num:"20",
	        current_page:"1",
	        si:"6"
	    },
	    headers: {
	        'User-Agent': 'Request-Promise'
	    },
	    json: true, // Automatically parses the JSON string in the response
		transform: function(body){
			return cheerio.load(body);
		}
	};
	//admin.database().ref('/account/search_reslt').push({"initialize":"initialize"});
	
	rp(options)
	.then(function($){
			var title;
			var	author;
			
			var json = {title:"",author:""};
			
			$(".list_box").filter(function(){
					var data_title = $(this).children().find("li>a").text().trim();
					var data_author = $(this).children().find(".product_info_content>p").first().text().trim();
					data_author = data_author.replace("作者:","");

					if(data_title!=""){
						json.title = data_title;
						json.author = data_author;
						//console.log(json);
						event.data.ref.parent.child('search_reslt').push(json);
					}
			
					
			})
	})
	.catch(function(err){
		console.log(err);
	});

     
      console.log("search finish!");
      // You must return a Promise when performing asynchronous tasks inside a Functions such as
      // writing to the Firebase Realtime Database.
      // Setting an "uppercase" sibling in the Realtime Database returns a Promise.
      return event.data.ref.parent.child('isFinish').set("True");
      // [END searchkeyBody]
    });
// [END searchkey]
// [END all]
