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
const rp2 = require("request-promise");
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

exports.makesearch = functions.database.ref('/user_data/googleid_example/search/key')
    .onWrite(event => {
// [END searchkeyTrigger]
      // [START searchkey]
      // Grab the current value of what was written to the Realtime Database.
      
      event.data.ref.parent.child('isFinish').set("False");      
      
      var links=[];
		let myPromise = new Promise((resolve, reject) => {
		  // 當非同步作業成功時，呼叫 resolve(...),而失敗時則呼叫 reject(...)。
		  // 在這個例子中，使用 setTimeout(...) 來模擬非同步程式碼。
		  // 在實務中，您將可能使用像是 XHR 或者一個 HTML5 API.
		  setTimeout(function(){
		  	const searchkey = event.data.val();
     		console.log("search for",searchkey);

		  	var options = {
			    uri: 'http://webpac.lib.ntpu.edu.tw/search.cfm?',
			    qs: {
			        m:"ss",
			        k0:searchkey,
			        t0:"k",
			        c0:"and",
			        list_num:"10",
			        current_page:"1",
			    },
			    headers: {
			        'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36",
					"Accept-Language":"en-US,en;q=0.9",
					"Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
					"Connection":"keep-alive"
			    },
			    json: true, // Automatically parses the JSON string in the response
				transform: function(body){
					return cheerio.load(body);
				}
			};
			rp(options)
			.then(function($){
					var title;
					var	author;
					
					var json = {title:"",author:""};
					$(".list_box").filter(function(){
							var data_title = $(this).children().find("li>a").text().trim();
							var link = $(this).children().find("li>a").attr("href");	

							if(data_title!=""){
								var getlink = "http://webpac.lib.ntpu.edu.tw/"+link;
								links.push(getlink);
								
							}
					})
					var Allpage = $(".list_info").find("p").text().trim();
					Allpage = Allpage.split("/")[0];
					Allpage = Allpage.replace(/ /,"");
					Allpage = Allpage.split(",")[1];
					Allpage = Allpage.replace("共 ","");
					Allpage = Allpage.replace(" 筆","");

					console.log("All Page : "+Allpage);	
					event.data.ref.parent.child('Allpage').set(Allpage);
					event.data.ref.parent.child('currentPage').set("1");
			})
			.then(function(){
				//state = 1;
				resolve("Success!"); // Yay！非常順利！
			})
			.catch(function(err){
				console.log(err);
				reject("failed");
			});
		  }, 2000);
		});
		function sleep(ms) {
  			return new Promise(resolve => setTimeout(resolve, ms));
		}
		myPromise.then((msg) => {
			var i;
			console.log("load uris "+msg);
		  // successMessage 是任何您由上方 resolve(...) 傳入的東西。
		  // 在此僅作為成功訊息，但是它不一定是字串。
		  for(i=0;i<links.length;i++){
		  		//console.log("scraping.. : "+links[2]);
					var options = {
					    uri: links[i],	
						headers: {
						        'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36",
								"Accept-Language":"en-US,en;q=0.9",
								"Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
								"Connection":"keep-alive",
								"Host":"webpac.lib.ntpu.edu.tw"
						},
					    json: true, // Automatically parses the JSON string in the response
						transform: function(body){
							return cheerio.load(body,{decodeEntities: false});
							}
					};
					rp2(options)
					.then(function($){
							
							//var bookRef = admin.database.ref('');
							//console.log("\nhtml load success");
							

							var title = $(".info").first().find("h2").text().trim();

							var author = $(".info").find("p").html().split("<br>")[0].trim();
							author = author.replace('作者 :','');

							var publisher = $(".info").find("p").html().split("<br>")[1].trim();
							publisher = publisher.replace('出版社 :','');

							var publish_year = $(".info").find("p").html().split("<br>")[2].trim();
							publish_year = publish_year.replace("出版年 : ",'');

							var ISBN_tag = false;
							var ISBN = $(".info_box").find("p").html().split("<br>");
							for(var key in ISBN)
							{
								var text = ISBN[key].trim();
								if(!text.search("ISBN") && ISBN_tag==false)
								{
									var first_ISBN = text.replace("ISBN ： ","");
									//console.log(first_ISBN);
									ISBN_tag=true;
									break;
								}
							}

							var Bookjson = {
								"title":title,
								"author":author,
								"publisher":publisher,
								"publish_year":publish_year,
								"ISBN":first_ISBN
							};
							admin.database().ref('/user_data/googleid_example/search_result').push(Bookjson);
							
							//console.log(Bookjson);		
					})
					.then(function(){
						sleep(1000);
						console.log("search finish!");
					})
					.catch(function(err){
						//console.log(err);
					});
				//down	
				}
		})
		.then(function(){
			return event.data.ref.parent.child('isFinish').set("True");
		})
      // You must return a Promise when performing asynchronous tasks inside a Functions such as
      // writing to the Firebase Realtime Database.
      // Setting an "uppercase" sibling in the Realtime Database returns a Promise.
      return event.data.ref.parent.child('isFinish').set("Pending");
      // [END searchkeyBody]
    });
// [END searchkey]
// [END all]
