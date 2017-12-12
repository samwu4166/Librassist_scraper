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
  var config2 = {
  	apiKey: "AIzaSyDKpeNxuQZhPWP6AQd9uphsi775aIfhirU",
    authDomain: "librassist-ea4a3.firebaseapp.com",
    databaseURL: "https://librassist-ea4a3.firebaseio.com",
    projectId: "librassist-ea4a3",
    storageBucket: "librassist-ea4a3.appspot.com",
    messagingSenderId: "720700750764"
  }
 firebase.initializeApp(config2);

var db = firebase.database();

//ref.update({"nickname":"Handsome"});

function Xinpei(){
	var options = {
			    uri: 'http://webpac.tphcc.gov.tw/toread/opac/search?',
			    qs: {
			        q:"股票",
			        max:"0",
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
	const pr = rp(options)
	.then(function($){
		var title;
		var	author;

		var json={};
		var cn = -1;
		var cnn="";
		$(".is_img").filter(function(){

				var data_title = $(this).find(".reslt_item_head").text().trim();
				var data_author = $(this).find(".crs_author").text().trim();
				var links = $(this).find(".reslt_item_head>a").attr("href");
				
				if(cn >= 0) cnn="_"+cn;
				cn++;
				var data_count = $(this).find("#MyPageLink_4"+cnn).text().trim();
				data_count = data_count.replace(" 本館藏 可借閱", "");
				var image = $(this).find("img").attr("src");
				
				if(image == '/toread/images/macheteicons/book.gif')
				{
					image = "http://webpac.tphcc.gov.tw/toread/images/macheteicons/book.gif";
				}
				
				data_title = data_title.replace("/","");
				json.title = data_title;
				json.img = image;
				json.author = data_author;
				json.xinpei_lib = data_count;
				json.link = "http://webpac.tphcc.gov.tw"+links;
				console.log(json);
				
		})
	})
	.catch(reason =>{
		console.log(reason);
	})
	return Promise.all([pr]).then(()=>{
		console.log("finish!");
	})
	
}
Xinpei();
function new_book(){	
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
				console.log(json);
			}
		})

	})
	.catch(reason => {
		console.log(reason);
	});
	
	return Promise.all([newrp]).then(()=>{
		console.log("finish");
	})
}
function test_for_url_scrape()
{
	request("http://webpac.lib.ntpu.edu.tw/content.cfm?mid=153578&m=ss&k0=java&t0=k&c0=and&list_num=40&current_page=1&mt=&at=&sj=&py=&it=&lr=&lg=&si=6",function(err,resp,html){    //get 用qs來傳送參數
		if(html!=""){
			console.log("html load success\n");
			var $ = cheerio.load(html,{decodeEntities: false});
			var title;
			var	author;
			console.log('statusCode:', resp && resp.statusCode);
			
			var title = $(".info").first().find("h2").text().trim();

							var author = $(".info").find("p").html().split("<br>")[0].trim();
							author = author.replace('作者 :','');

							var publisher = $(".info").find("p").html().split("<br>")[1].trim();
							publisher = publisher.replace('出版社 :','')

							var publish_year = $(".info").find("p").html().split("<br>")[2].trim();
							publish_year = publish_year.replace("出版年 :",'');

							var image = $(".photo").find("img").attr("src");

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
							var true_isbn = first_ISBN[0];
							if(true_isbn.search("平裝"))
								true_isbn = true_isbn.replace("平裝","");
							var count=0;
							$("tbody").each(function(){
								var text = $(this).text().trim();
								
								if(text.search("Available")>0){
									count++;
								}
							})


							var Bookjson = {
								[true_isbn]:
									{
										"title":title,
										"lib":{ntpu:count},
										"img":image,
										"publish_year":publish_year,
										"publisher":publisher,
										"trivial":{
											isFinish:"true",
											refresh:"false"
										},
									}
								};
							
							console.log(Bookjson);
		}
		else
		{
			console.log("html failed!");
		}
		//console.log(html);
	});
}


function test_cloud_prepared(keyvalue,page)
{

		var links=[];
		var Allpage;
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
			        list_num:"20",
			        current_page:page,
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
					Allpage = $(".list_info").find("p").text().trim();
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
		function call_back(){
			
			if((parseInt(Allpage)-parseInt(page)*20)>0 && parseInt(page)<20 ){
				
				sleep(2000);
				test_cloud_prepared(keyvalue,(parseInt(page)+1).toString());
				console.log("scrape ",keyvalue," ",page);
				//console.log(keyvalue," ",(parseInt(page)+1).toString());
			}
			//console.log("function returns");
			return;
			
		}
		myPromise.then((msg) => {
			var i;
			console.log("load uris "+msg);
		  // successMessage 是任何您由上方 resolve(...) 傳入的東西。
		  // 在此僅作為成功訊息，但是它不一定是字串。
		  for(i=0;i<links.length;i++){
		  		//
		  			var mylink = links[i];
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


							var img = $(".photo").find("img").attr("src");

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
								"location":"ntpu",
								"title":title,
								"author":author,
								"publisher":publisher,
								"publish_year":publish_year,
								"ISBN":first_ISBN,
								"link":mylink,
								"image":img
							};
							
							db.ref('/library_books/'+keyvalue+'/').push(Bookjson);
						
					})
					.then(function(){
						sleep(2000);
					})
					.catch(function(err){
						//console.log(err);
					});
				//down	
				}
				return call_back();
		})
		.catch(function(err){
			console.log(err);
		})
		return console.log("end of scrape");
}
function test_for_search_url(){

    var links=[];

	var options = {
			    uri: 'http://webpac.lib.ntpu.edu.tw/search.cfm?',
			    qs: {
			        m:"ss",
			        k0:"python",
			        t0:"k",
			        c0:"and",
			        list_num:"20",
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

					var json = {title:"",author:"",link:"",isFinish:"false"};
					$(".list_box").filter(function(){
							var data_title = $(this).children().find("li>a").text().trim();
							var data_author = $(this).children().find(".product_info_content>p").first().text().trim();
							var link = $(this).children().find("li>a").attr("href");
							var image = $(this).find(".product_img>img").attr("src");	
							data_author = data_author.replace("作者:","");

							if(data_title!=""){
								var getlink = "http://webpac.lib.ntpu.edu.tw/"+link;
								json.title = data_title;
								json.author = data_author;
								json.link = getlink;
								json.img = image;
								console.log(json);
								//db.ref('/search_test/search_result').push(json);
							}
					})
					
					
					var Allpage = $(".list_info").find("p").text().trim();
					Allpage = Allpage.split("/")[0];
					Allpage = Allpage.replace(/ /,"");
					Allpage = Allpage.split(",")[1];
					Allpage = Allpage.replace("共 ","");
					Allpage = Allpage.replace(" 筆","");

					//console.log("All Page : "+Allpage);	
					
			})
			.then(function(){
				 //db.ref('/isFinish').set("True");
			})
			.catch(function(err){
				console.log(err);
			});
		
      // You must return a Promise when performing asynchronous tasks inside a Functions such as
      // writing to the Firebase Realtime Database.
      // Setting an "uppercase" sibling in the Realtime Database returns a Promise.
      //db.ref('/isFinish').set("pending");
}
function sleep(ms) {
  			return new Promise(resolve => setTimeout(resolve, ms));
		}
var testJson = {
	"00000001":
	{
		"lib":
		{
			"sinpei":"1"
		}
	}
}
var testJson2 = {
	"00000001":
	{
		"lib":
		{
			"taipei":"1"
		}
	}
}

var testJson3 = {
	"00000002":
	{
		"lib":
		{
			"ntpu":"1"
		}
	}
}
const isbn = "00000002";

/*   // this code is detect that if isbn in search_result is exist or not (unapply)
db.ref('/search_result_test/'+isbn+'/').once('value')
.then(function(snap){
	var a = snap.exists();
	if(a)
	{
		var value = snap.child('lib').val();
		
		value.ntpu = "0";
		var json = {"lib":value};
		console.log(json);
		db.ref('search_result_test/'+isbn+'/').update(json);
		console.log("exist!");
	}
	else
	{
		db.ref('search_result_test/').update(testJson3);
		console.log("create new one");
	}
})
*/
//console.log(testJson);
