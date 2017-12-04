var request = require("request");
var cheerio = require("cheerio");
var firebase = require("firebase");
var rp = require("request-promise");
var rp2 = require("request-promise");
// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
// The Firebase Admin SDK to access the Firebase Realtime Database. 
var config = {
    apiKey: "AIzaSyDzHx_01EmnGkXsHmQKDMh4rA9GYCJzdkk",
    authDomain: "librarytest-16eb2.firebaseapp.com",
    databaseURL: "https://librarytest-16eb2.firebaseio.com",
    projectId: "librarytest-16eb2",
    storageBucket: "librarytest-16eb2.appspot.com",
    messagingSenderId: "923330716692"
  };
 firebase.initializeApp(config);
/*
var db = firebase.database();
var ref = db.ref("/");
ref.update({"nickname":"Handsome"});
*/

function Xinpei(book_name){
	var url = "http://webpac.tphcc.gov.tw/toread/opac/search?";

	var form = { q:book_name,max:"0",view:"CONTENT",location:"0"};

	request({url:url,qs:form},function(err,resp,html){    //get 用qs來傳送參數
		var $ = cheerio.load(html);
		var title;
		var	author;

		var json = {title:"",author:""};
		$(".data_reslt").filter(function(){
				var data_title = $(this).find(".reslt_item_head").text().trim();
				var data_author = $(this).find(".crs_author").text().trim();
				data_title = data_title.replace("/","");
				json.title = data_title;
				json.author = data_author;
			
				console.log(json);
		})
		console.log("Create success");
	});
}
function ntpu(books,page,list_max)
{
	var url = "http://webpac.lib.ntpu.edu.tw/search.cfm?";

	var form = { m:"ss",k0:books,t0:"k",c0:"and",list_num:list_max,current_page:page,si:"6"};

	request({url:url,qs:form},function(err,resp,html){    //get 用qs來傳送參數
		if(html!=""){
			console.log("html load success\n");
			var $ = cheerio.load(html);
			var title;
			var	author;
			console.log('statusCode:', resp && resp.statusCode);
			var json = {title:"",author:""};
			$(".list_box").filter(function(){
					var data_title = $(this).children().find("li>a").text().trim();
					var data_author = $(this).children().find(".product_info_content>p").first().text().trim();
					data_author = data_author.replace("作者:","");

					if(data_title!=""){
						json.title = data_title;
						json.author = data_author;
						//console.log(json);
					}
			})
			var Allpage = $(".list_info").find("p").text().trim();
			Allpage = Allpage.split("/")[0];
			Allpage = Allpage.replace(/ /,"");
			Allpage = Allpage.split(",")[1];
			Allpage = Allpage.replace("共 ","");
			Allpage = Allpage.replace(" 筆","");
			console.log("All Page : "+Allpage);
		}
		else
		{
			console.log("html failed!");
		}
		//console.log(html);
	});
}



function test_cloud_prepared(keyvalue)
{

		var links=[];
		let myPromise = new Promise((resolve, reject) => {
		  // 當非同步作業成功時，呼叫 resolve(...),而失敗時則呼叫 reject(...)。
		  // 在這個例子中，使用 setTimeout(...) 來模擬非同步程式碼。
		  // 在實務中，您將可能使用像是 XHR 或者一個 HTML5 API.
		  setTimeout(function(){
		  	var options = {
			    uri: 'http://webpac.lib.ntpu.edu.tw/search.cfm?',
			    qs: {
			        m:"ss",
			        k0:keyvalue,
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
					console.log("All Page :"+Allpage+".");
				
			})
			.then(function(){
				state = 1;
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
		  		//
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
						
							//console.log("\nhtml load success");
							//var $ = cheerio.load(html);

							var title = $(".info").first().find("h2").text().trim();

							var author = $(".info").find("p").html().split("<br>")[0].trim();
							author = author.replace('作者 :','');

							var publisher = $(".info").find("p").html().split("<br>")[1].trim();
							publisher = publisher.replace('出版社 :','')

							var publish_year = $(".info").find("p").html().split("<br>")[2].trim();
							publish_year = publish_year.replace("出版年 :",'');

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
							
							console.log(Bookjson);
						
					})
					.then(function(){
						sleep(2000);
					})
					.catch(function(err){
						//console.log(err);
					});
				//down	
				}
		});
}

test_cloud_prepared("python");

//ntpu("c++","1","10");