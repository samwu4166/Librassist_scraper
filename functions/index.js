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
///////////////////////////////////////////////////////////////////////////////////////////////////////////
exports.ntpu_scrape_info = functions.database.ref('/user_data/{userId}/search/{time}/temp_search_ntpu/{pushId}/link')
    .onCreate(event => {
   
	const searchUrl = event.data.val();
	const uid = event.params.userId;
	const local_time = event.params.time;
	const root = event.data.ref.root;
	event.data.ref.parent.child('searchState').set("Pending!");
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
				var jsons = {
								"isbn":"",
								"title":"",
								"author":"",
								"img":"",
								"publish_year":"",
								"publisher":"",
								"link":"",
								"storage":"",
								"location":"",
								"searchState":""
						};

				var title = $(".info").first().find("h2").text().trim();

				var author = $(".info").find("p").html().split("<br>")[0].trim();
				author = author.replace('作者 :','');

				var publisher = $(".info").find("p").html().split("<br>")[1].trim();
				publisher = publisher.replace('出版社 :','');

				var publish_year = $(".info").find("p").html().split("<br>")[2].trim();
				publish_year = publish_year.replace("出版年 : ",'');

				var image = $(".photo").find("img").attr("src");
				if(image == null)
				{
					image = "";
				}

				var links = searchUrl;
				var true_isbn = "";
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
						true_isbn = first_ISBN[0];
						//console.log(first_ISBN);
						ISBN_tag=true;
						break;
					}
				}
				
				// deal with chinese without space
				
				true_isbn = true_isbn.replace("平裝","");
				true_isbn = true_isbn.replace("精裝","");
				true_isbn = true_isbn.replace("()","");
				true_isbn = true_isbn.replace(":","");

				
				var count=0;
				$("tbody").each(function(){
					var text = $(this).text().trim();
								
					if(text.search("Available")>0){
						count++;
					}
				})
			
				//set the json
				count = count+"";
				jsons = {
								"isbn":true_isbn,
								"title":title,
								"author":author,
								"img":image,
								"publish_year":publish_year,
								"publisher":publisher,
								"link":links,
								"storage":count,
								"location":"ntpu_lib",
								"searchState":"true"
						};
				//push the json to firebase
				admin.database().ref('/user_data/'+uid+'/search/'+local_time+'/search_result').push(jsons);
				
		})
		.catch(function(err){
			event.data.ref.parent.child('searchState').set(err);
			//console.log(err);
		});		
		//return the request-promise to avoid this function being canceled
		return Promise.all([searchrp]).then(()=>{
				return event.data.ref.parent.remove();
			})
			.catch(function(err){
				event.data.ref.parent.child('refresh').set('go');
				console.log("Promise ",searchUrl," wrong!");
			})
      // [END searchkeyBody]
    });
// [END searchkey]
// [END all]
///////////////////////////////////////////////////////////////////////////////////////////////////////////
exports.ntpu_search_url = functions.database.ref('/user_data/{userId}/search/{time}/key')
    .onCreate(event => {

    	const uid = event.params.userId;
    	const local_time = event.params.time;
    	var counter = 0;
    	console.log("uid is "+uid);
    	const root = event.data.ref.root;
    
    	event.data.ref.parent.child('ntpu_url').set('false');
    	const key = event.data.val();
    		
    	var options = {
				    uri: 'http://webpac.lib.ntpu.edu.tw/search.cfm?',
				    qs: {
				        m:"ss",
				        k0:key,
				        t0:"k",
				        c0:"and",
				        list_num:"25",
				        current_page:"1",
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
					
						var json = {title:"",author:"",link:"",refresh:"false",img:"",searchState:"",location:"",storage:"",publish_year:"",publisher:"",isbn:""};
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
									json.location = "ntpu_lib";
									json.searchState = "false";
									admin.database().ref('/user_data/'+uid+'/search/'+local_time+'/temp_search_ntpu').push(json);
									counter++;
								}
						})

				})
				.catch(function(err){
					console.log(err);
				});
			return Promise.all([searchrp]).then(()=>{
					console.log("Scrape "+key+" success");
					//event.data.ref.parent.child('key').remove();
					return event.data.ref.parent.child('ntpu_url').set(counter.toString());
			})
			.catch(reason => {
				admin.database().ref('/user_data/'+uid+'/search/'+local_time+'/isFinish').push(reason);
			});
    	
    });
//////////////////////////////////////////////////////////////////////////////////////////////////////////

exports.ntpu_refresh = functions.database.ref('/user_data/{userId}/search/{time}/temp_search_ntpu/{pushId}/refresh')
	.onUpdate(event => {
			const uid = event.params.userId;
			const local_time = event.params.time;
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

				var jsons = {
								"isbn":"",
								"title":"",
								"author":"",
								"img":"",
								"publish_year":"",
								"publisher":"",
								"link":"",
								"location":"",
								"storage":"",
								"searchState":""
						};


				var title = $(".info").first().find("h2").text().trim();

				var author = $(".info").find("p").html().split("<br>")[0].trim();
				author = author.replace('作者 :','');

				var publisher = $(".info").find("p").html().split("<br>")[1].trim();
				publisher = publisher.replace('出版社 :','');

				var publish_year = $(".info").find("p").html().split("<br>")[2].trim();
				publish_year = publish_year.replace("出版年 : ",'');

				var image = $(".photo").find("img").attr("src");

				var links = searchUrl;

				var true_isbn = "";
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
						true_isbn = first_ISBN[0];
						//console.log(first_ISBN);
						ISBN_tag=true;
						break;
					}
				}

				// deal with chinese without space
				true_isbn = true_isbn.replace("平裝","");
				true_isbn = true_isbn.replace("精裝","");
				true_isbn = true_isbn.replace("()","");
				true_isbn = true_isbn.replace(":","");

				var count=0;
				$("tbody").each(function(){
					var text = $(this).text().trim();
								
					if(text.search("Available")>0){
						count++;
					}
				})
				count= count+"";
				jsons = {
								"isbn":true_isbn,
								"title":title,
								"author":author,
								"img":image,
								"publish_year":publish_year,
								"publisher":publisher,
								"link":links,
								"location":"ntpu_lib",
								"storage":count,
								"searchState":"true"
						};
				
				admin.database().ref('/user_data/'+uid+'/search/'+local_time+'/search_result').push(jsons);
				return event.data.ref.parent.remove();
			})
			.catch(function(err){
				console.log(err);
				//console.log("too late!");
			});
			return Promise.all([refresh_search]).then(()=>{
					console.log("refresh finish");
			})
			.catch(reason=>{
				return event.data.ref.parent.child('searchState').set(err);
			})
		})
	});
	
///////////////////////////////////////////////////////////////////////////////////////////////////////////
exports.Xinpei_search_url = functions.database.ref('/user_data/{userId}/search/{time}/key')
    .onCreate(event => {

    	const uid = event.params.userId;
    	const local_time = event.params.time;
    	console.log("(sinpei)uid is "+uid);
    	const root = event.data.ref.root;
    	var counter = 0;
    	const key = event.data.val();
    	event.data.ref.parent.child('Xinpei_url').set("false");
    	var options = {
			    uri: 'http://webpac.tphcc.gov.tw/toread/opac/search?',
			    qs: {
			        q:key,
			        max:"1",  //2->50 books
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
					var json = {title:"",author:"",location:"",link:"",img:"",searchState:"",storage:"",isbn:"",publish_year:"",publisher:""};
					var cn = -1;
					var cnn="";
					$(".is_img").filter(function(){
						
						var data_title = $(this).find(".reslt_item_head").text().trim();
						var data_author = $(this).find(".crs_author").text().trim();
						var links = $(this).find(".reslt_item_head>a").attr("href");
						if(cn >= 0) cnn="_"+cn;
						cn++;
						var image = $(this).find("img").attr("src");
						var data_count = $(this).find("#MyPageLink_4"+cnn).text().trim();

						if(image == '/toread/images/macheteicons/book.gif')
						{
							image = "http://webpac.tphcc.gov.tw/toread/images/macheteicons/book.gif";
						}

						data_count = data_count.replace(" 本館藏 可借閱", "");
						data_title = data_title.replace("/","");
						json.title = data_title;
						json.author = data_author;
						json.location = "ntc_lib";
						json.link = "http://webpac.tphcc.gov.tw"+links;
						json.storage = data_count;
						json.img = image;
						json.searchState = "false";

						event.data.ref.parent.child('temp_result_Xinpei').push(json);
						counter++;
					})
					

				})
				.catch(function(err){
					console.log(err);
				});
			return Promise.all([searchrp]).then(()=>{
					console.log("(inpei)Scrape "+key+" success");
					return event.data.ref.parent.child('Xinpei_url').set(counter.toString());
			})
			.catch(reason => {
				admin.database().ref('/user_data/'+uid+'/search/'+local_time+'/isFinish').push(reason);
			})
    	
    });
///////////////////////////////////////////////////////////////////////////////////////////////////////////
exports.Xinpei_search_info = functions.database.ref('/user_data/{userId}/search/{time}/temp_result_Xinpei/{pushId}/link')
    .onCreate(event => {
    const searchUrl = event.data.val();
	const uid = event.params.userId;
	const local_time = event.params.time;
	const pr1 = event.data.ref.parent.child('storage').once('value');
	const root = event.data.ref.root;
	event.data.ref.parent.child('searchState').set("Pending!");
	return Promise.all([pr1]).then( results => {

		const count_book = results[0].val();
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
		const searchrp = rp(options).then(function($){
			var title, author, isbn, year, publisher, img;
			var json = {title:"",author:"",location:"",link:"",img:"",searchState:"",storage:"",isbn:"",publish_year:"",publisher:""};
			
			$(".reslt_item_head").filter(function(){       //title
				var data_title = $(this).text().trim();
				data_title = data_title.replace("/","");
				json.title = data_title;
			})
			$(".img_reslt").filter(function(){       //image
				var data_img = $(this).find("#Any_10").attr("src");
				if(data_img == null)
				{
					data_img = "";
				}
				json.img = data_img;
			})

			$(".bibViewTable").filter(function(){        //author, isbn, year, publisher
				var data_author="", data_isbn="", data_year="", data_publisher="";
				for(var i = 0 ; i<20;i++){
					var str="#For_"+i+">th";
					var ss =$(this).find(str).text().trim();
						if(ss.search("作者:")>=0) 	
							data_author = $(this).find("#For_"+i+">td").text().trim();
						else if(ss == "ISBN:")
							data_isbn = $(this).find("#For_"+i+">td").text().trim();
						else if(ss == "出版年:")
							data_year = $(this).find("#For_"+i+">td").text().trim();
						else if(ss == "出版者:")
							data_publisher = $(this).find("#For_"+i+">td").text().trim();
				}
				if(data_year=="")
				{
					if(data_publisher.search(",")>=0){
						data_publisher = data_publisher.split(",",2);
						data_year = data_publisher[1];
						data_publisher = data_publisher[0];
					}
					else if(data_publisher.search(";")>=0)
					{
						data_publisher = data_publisher.split(";",2);
						data_year = data_publisher[1];
						data_publisher = data_publisher[0];
					}
				}
				
				data_publisher = data_publisher.replace(";",'');
				data_isbn = data_isbn.replace("平裝", "");
				data_isbn = data_isbn.replace("精裝", "");
				data_isbn = data_isbn.replace("()", "");
				data_isbn = data_isbn.replace(":", "");

				json.author = data_author;
				json.isbn = data_isbn;
				json.publish_year = data_year;
				json.publisher = data_publisher;
				json.link = searchUrl;
				json.searchState = "true";
				json.storage = count_book;
				json.location = "ntc_lib";
				admin.database().ref('/user_data/'+uid+'/search/'+local_time+'/search_result').push(json);
				
			})
					
		})
		.catch(reason => {
			event.data.ref.parent.child('searchState').set(reason);
		});
		
		return Promise.all([searchrp]);
	})
	.then(()=>{
		return event.data.ref.parent.remove();
	})
	
})

///////////////////////////////////////////////////////////////////////////////////////////////////////////
exports.hot_key_info = functions.database.ref('/hot_key/trigger')
	.onDelete(event => {
		var url = "http://www.books.com.tw/web/books/?loc=menu_1_001", keywords;

		event.data.ref.parent.child('result').remove();
		event.data.ref.parent.child('isFinish').set('false');
		event.data.ref.parent.child('trigger').set('searching');
		var options = {
			    uri: url,
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
		const keyrp = rp(options).then(function($){
			
			$(".clearfix>li>a").filter(function(){
				var k = $(this).text().trim();
				if(k!=""){
					keywords = k;
					var json = {[keywords]:keywords};
					event.data.ref.parent.child('result').update(json);
				}
			})

		})
		.catch(reason => {
			console.log(reason);
		});
		
		return Promise.all([keyrp]).then(()=>{
			event.data.ref.parent.child('trigger').set('deleteMe');
			event.data.ref.parent.child('isFinish').set('true');
		})

	});
///////////////////////////////////////////////////////////////////////////////////////////////////////////
exports.new_book_url = functions.database.ref('/new_book/trigger')
	.onDelete(event => {

	event.data.ref.parent.child('search_result').remove();
	
	event.data.ref.parent.child('trigger').set('searching');

	var url = "http://webpac.lib.ntpu.edu.tw/newbook_focus.cfm";
	var options = {
		    uri: url,
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
	const newrp = rp(options).then(function($){
		var json = {};
		$(".bookDetail").each(function(){
			var data_title = $(this).find(".title").text().trim();
			var data_author = $(this).find(".author").text().trim();
			var links = $(this).find(".title>a").attr("href");
			var img = "http://webpac.lib.ntpu.edu.tw/"+ $(this).find("img").attr("src");
			if(data_title!=""){
				json.link = "http://webpac.lib.ntpu.edu.tw/"+links;
				json.image = img;
				json.title = data_title;
				json.author = data_author;
				json.location = "ntpu_lib";
				event.data.ref.parent.child('temp_result').push(json);
			}
		})

	})
	.catch(reason => {
		console.log(reason);
	});
	
	return Promise.all([newrp]).then(()=>{
		event.data.ref.parent.child('searchState').set('info_search');	
	})
})
///////////////////////////////////////////////////////////////////////////
exports.new_book_info = functions.database.ref('/new_book/temp_result/{pushId}/link')
	.onCreate(event => {

	admin.database().ref('/new_book/searchState').set('search_info');

	var url = event.data.val();
	var options = {
		    uri: url,
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
		const newrp = rp(options).then(function($){

		var title = $(".info").first().find("h2").text().trim();

		var author = $(".info").find("p").html().split("<br>")[0].trim();
		author = author.replace('作者 :','');

		var publisher = $(".info").find("p").html().split("<br>")[1].trim();
		publisher = publisher.replace('出版社 :','');

		var publish_year = $(".info").find("p").html().split("<br>")[2].trim();
		publish_year = publish_year.replace("出版年 : ",'');

		var image = "http://webpac.lib.ntpu.edu.tw/" + $(".photo").find("img").attr("src");

		var links = url;

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
				
			count = count+"";
			var jsons = {
					"isbn":true_isbn,
					"title":title,
					"author":author,
					"img":image,
					"publish_year":publish_year,
					"publisher":publisher,
					"link":links,
					"storage":count,
					"location":"ntpu_lib",
					"searchState":"true"
					};
			admin.database().ref('/new_book/search_result').push(jsons);
	})
	.catch(reason => {
		console.log(reason);
	});
	
	return Promise.all([newrp]).then(()=>{
		event.data.ref.parent.remove();
		admin.database().ref('/new_book/searchState').set('Finish');
		admin.database().ref('/new_book/trigger').set('DeleteMe_to_search');
	})
})