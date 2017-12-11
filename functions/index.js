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

exports.ntpu_scrape_info = functions.database.ref('/user_data/{userId}/search/temp_result_ntpu/{pushId}/link')
    .onCreate(event => {
   
	const searchUrl = event.data.val();
	const uid = event.params.userId;
	const root = event.data.ref.root;
	event.data.ref.parent.child('isFinish').set("Pending!");
	// set request-promise options 
	var options = {
			    uri: searchUrl,
			    headers: {
			        'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36",
					"Accept-Language":"en-US,en;q=0.9",
					"Connection":"keep-alive"
			    },
			    json: true, // Automatically parses the JSON string in the response
				transform: function(body){
					// use decodeEntities to prevent wrong chinese
					return cheerio.load(body,{decodeEntities: false});
				}
			};
			//start a request promise and parse the html
	const searchrp = rp2(options)
			.then(function($){		
				
				var title = $(".info").first().find("h2").text().trim();

				var author = $(".info").find("p").html().split("<br>")[0].trim();
				author = author.replace('作者 :','');

				var publisher = $(".info").find("p").html().split("<br>")[1].trim();
				publisher = publisher.replace('出版社 :','');

				var publish_year = $(".info").find("p").html().split("<br>")[2].trim();
				publish_year = publish_year.replace("出版年 : ",'');

				var image = $(".photo").find("img").attr("src");

				var links = searchUrl;

				var ISBN_tag = false;
				var ISBN = $(".info_box").find("p").html().split("<br>");
				for(var key in ISBN)
				{
					var text = ISBN[key].trim();
					if(!text.search("ISBN") && ISBN_tag==false)
					{
						//deal with some word behind isbn by split the space
						var first_ISBN = text.replace("ISBN ： ","");
						first_ISBN = first_ISBN.split(" ",1);
						//console.log(first_ISBN);
						ISBN_tag=true;
						break;
					}
				}
				var true_isbn = first_ISBN[0];
				// deal with chinese without space
				if(true_isbn.search("平裝"))
					true_isbn = true_isbn.replace("平裝","");

				var count=0;
				$("tbody").each(function(){
					var text = $(this).text().trim();
								
					if(text.search("Available")>0){
						count++;
					}
				})
				/*	Abandaned
				var Bookjson = {
						[true_isbn]:
							{
								"title":title,
								"author":author,
								"img":image,
								"publish_year":publish_year,
								"publisher":publisher,
								"link":links,
								"lib":{ntpu:count},
								"trivial":{
									isFinish:"true",
									refresh:"false"
								},
							}
						};
						*/
				//set the json
				var jsons = {
								"isbn":true_isbn,
								"title":title,
								"author":author,
								"img":image,
								"publish_year":publish_year,
								"publisher":publisher,
								"link":links,
								"ntpu_lib":count,
								"isFinish":"true"
						};
				//push the json to firebase
				admin.database().ref('/user_data/'+uid+'/search/search_result').push(jsons);
				
		})
		.catch(function(err){
			event.data.ref.parent.remove();
			console.log(err);
		});		
		//return the request-promise to avoid this function being canceled
		return Promise.all([searchrp]).then(()=>{
				return event.data.ref.parent.remove();
			})
			.catch(function(err){
				console.log("search ",searchUrl," wrong!");
			})
      // [END searchkeyBody]
    });
// [END searchkey]
// [END all]

exports.ntpu_search_url = functions.database.ref('/user_data/{userId}/search/key')
    .onCreate(event => {

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
					
						var json = {title:"",author:"",link:"",refresh:"false"};
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
									event.data.ref.parent.child('temp_result_ntpu').push(json);
								}
						})

				})
				.catch(function(err){
					console.log(err);
					return event.data.ref.parent.child('error_occur').set(err);
				});
			return Promise.all([searchrp]).then(()=>{
					console.log("Scrape "+key+" success");
					//event.data.ref.parent.child('key').remove();
					return event.data.ref.parent.child('isFinish').set("true");
			})
    	});
    });

exports.ntpu_refresh = functions.database.ref('/user_data/{userId}/search/temp_result_ntpu/{pushId}/refresh')
	.onUpdate(event => {
			const uid = event.params.userId;
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

				var image = $(".photo").find("img").attr("src");

				var links = searchUrl;

				var ISBN_tag = false;
				var ISBN = $(".info_box").find("p").html().split("<br>");
				for(var key in ISBN)
				{
					var text = ISBN[key].trim();
					if(!text.search("ISBN") && ISBN_tag==false)
					{
						//deal with some word behind isbn by split the space
						var first_ISBN = text.replace("ISBN ： ","");
						first_ISBN = first_ISBN.split(" ",1);
						//console.log(first_ISBN);
						ISBN_tag=true;
						break;
					}
				}
				var true_isbn = first_ISBN[0];
				// deal with chinese without space
				if(true_isbn.search("平裝"))
					true_isbn = true_isbn.replace("平裝","");

				var count=0;
				$("tbody").each(function(){
					var text = $(this).text().trim();
								
					if(text.search("Available")>0){
						count++;
					}
				})
				var jsons = {
								"isbn":true_isbn,
								"title":title,
								"author":author,
								"img":image,
								"publish_year":publish_year,
								"publisher":publisher,
								"link":links,
								"ntpu_lib":count,
								"isFinish":"true"
						};
				
				admin.database().ref('/user_data/'+uid+'/search/search_result').push(jsons);

			})
			.catch(function(err){
				console.log(err);
				//console.log("too late!");
			});
			return Promise.all([refresh_search]).then(()=>{
					return event.data.ref.parent.remove();
			})
		})
	});


exports.sinpei_search_url = functions.database.ref('/user_data/{userId}/search/key')
    .onCreate(event => {

    	const uid = event.params.userId;
    	console.log("(sinpei)uid is "+uid);
    	const root = event.data.ref.root;
    	
    	const key = event.data.val();
    		
    	var options = {
			    uri: 'http://webpac.tphcc.gov.tw/toread/opac/search?',
			    qs: {
			        q:key,
			        max:"2",
			        view:"CONTENT",
			        location:"0",
			    },
			    headers: {
			        'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36",
					"Accept-Language":"en-US,en;q=0.9",
					"Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
					"Connection":"keep-alive"
			    },
			    json: true, // Automatically parses the JSON string in the response
				transform: function(body){
					return cheerio.load(body,{decodeEntities: false});
					}
				};
 				const searchrp = rp(options)
				.then(function($){
					var title;
					var	author;

					var json = {title:"",author:""};
					$(".data_reslt").filter(function(){
							var data_title = $(this).find(".reslt_item_head").text().trim();
							var data_author = $(this).find(".crs_author").text().trim();
							var links = $(this).find(".reslt_item_head>a").attr("href");

							data_title = data_title.replace("/","");
							json.title = data_title;
							json.author = data_author;
							json.link = "http://webpac.tphcc.gov.tw"+links;
							
							event.data.ref.parent.child('temp_result_sinpei').push(json);
						})
				})
				.catch(function(err){
					console.log(err);
				});
			return Promise.all([searchrp]).then(()=>{
					console.log("(sinpei)Scrape "+key+" success");
					return event.data.ref.parent.child('SinpeisFinish').set("true");
			})
    	
    });