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

exports.ntpu_scrape_info = functions.database.ref('/user_data/{userId}/search/search_result/{pushId}/link')
    .onCreate(event => {
   
	const searchUrl = event.data.val();
	event.data.ref.parent.child('isFinish').set("Pending!");
	var options = {
			    uri: searchUrl,
			    headers: {
			        'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36",
					"Accept-Language":"en-US,en;q=0.9",
					"Connection":"keep-alive"
			    },
			    json: true, // Automatically parses the JSON string in the response
				transform: function(body){
					return cheerio.load(body,{decodeEntities: false});
				}
			};
	const searchrp = rp2(options)
			.then(function($){		
				
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
						first_ISBN = first_ISBN.split(" ",1);
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
					"ISBN":first_ISBN[0],
					"isFinish":"true"
				};
				event.data.ref.parent.update(Bookjson);			
		})
		.catch(function(err){
			console.log(err);
		});		
	return Promise.all([searchrp]).then(()=>{
				return event.data.ref.parent.child('isFinish').set("true");
			})
			.catch(function(err){
				console.log(err);
			})
      // [END searchkeyBody]
    });
// [END searchkey]
// [END all]

exports.ntpu_search_url = functions.database.ref('/user_data/{userId}/search/key')
    .onWrite(event => {

    	const uid = event.params.userId;
    	console.log("uid is "+uid);
    	const root = event.data.ref.root;
    	const pr = event.data.ref.parent.child('currentPage').once('value');
		
    	return Promise.all([pr]).then(results =>{
    		const key = event.data.val();
    		const page = results[0].val();
    		console.log("page is ",page);
    		var options = {
				    uri: 'http://webpac.lib.ntpu.edu.tw/search.cfm?',
				    qs: {
				        m:"ss",
				        k0:key,
				        t0:"k",
				        c0:"and",
				        list_num:"40",
				        current_page:page,
				    },
				    headers: {
				        'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36",
						"Accept-Language":"en-US,en;q=0.9",
						"Connection":"keep-alive"
				    },
				    json: true, // Automatically parses the JSON string in the response
					transform: function(body){
						return cheerio.load(body);
					}
				};
 				const searchrp = rp(options)
				.then(function($){
						var title;
						var	author;
					
						var json = {title:"",author:"",link:"",location:"ntpu",refresh:"false"};
						$(".list_box").filter(function(){
								var data_title = $(this).children().find("li>a").text().trim();
								var data_author = $(this).children().find(".product_info_content>p").first().text().trim();
								var link = $(this).children().find("li>a").attr("href");	
								var image = $(this).find(".product_img>img").attr("src");

								if(data_title!=""){
									var getlink = "http://webpac.lib.ntpu.edu.tw/"+link;
									json.title = data_title;
									json.author = data_author;
									json.link = getlink;
									json.img = image;
									event.data.ref.parent.child('search_result').push(json);
								}
						})

						var Allpage = $(".list_info").find("p").text().trim();
						Allpage = Allpage.split("/")[0];
						Allpage = Allpage.replace(/ /,"");
						Allpage = Allpage.split(",")[1];
						Allpage = Allpage.replace("共 ","");
						Allpage = Allpage.replace(" 筆","");

						console.log("All Page : "+Allpage);	
						return event.data.ref.parent.child('Allpage').set(Allpage);
				})
				.catch(function(err){
					console.log(err);
				});
			return Promise.all([searchrp]).then(()=>{
					console.log("Scrape "+key+" success");
					return event.data.ref.parent.child('isFinish').set("true");
			})
    	});
    });

exports.ntpu_refresh = functions.database.ref('/user_data/{userId}/search/search_result/{pushId}/refresh')
	.onUpdate(event => {

			

			return event.data.ref.parent.child('link').once('value')
			.then(function(snapshot) {
				return snapshot.val();
			})
			.then(function(searchUrl){
				var options = {
						    uri: searchUrl,
						    headers: {
						        'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36",
								"Accept-Language":"en-US,en;q=0.9",
								"Connection":"keep-alive"
						    },
						    json: true, // Automatically parses the JSON string in the response
							transform: function(body){
								return cheerio.load(body,{decodeEntities: false});
							}
						};
			const refresh_search = rp(options)
				.then(function($){		
					

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
							first_ISBN = first_ISBN.split(" ",1);
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
						"ISBN":first_ISBN[0],
						"isFinish":"true"
					};
					event.data.ref.parent.update(Bookjson);	
								//console.log(Bookjson);		
			})
			.catch(function(err){
				console.log(err);
				//console.log("too late!");
			});
			return Promise.all([refresh_search]).then(()=>{
					return event.data.ref.parent.child('isFinish').set("true");
			})
		})
	});
