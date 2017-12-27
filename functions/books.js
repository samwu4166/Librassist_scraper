var request = require("request");
var cheerio = require("cheerio");
var firebase = require("firebase");
var rp = require("request-promise");
var rp2 = require("request-promise");
// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
// The Firebase Admin SDK to access the Firebase Realtime Database. 

	
function Xinpei(searchUrl){	
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
		var json = {};
		
		$(".reslt_item_head").filter(function(){       //title
			var data_title = $(this).text().trim();
			data_title = data_title.replace("/","");
			json.title = data_title;
		})
		$(".img_reslt").filter(function(){       //image
			var data_img = $(this).find("#Any_10").attr("src");
			json.img = data_img;
		})

		$(".bibViewTable").filter(function(){        //author, isbn, year, publisher
				var data_author="", data_isbn="", data_year="", data_publisher="";
				for(var i = 0 ; i<20;i++){
					var str="#For_"+i+">th";
					var ss =$(this).find(str).text().trim();
					//console.log(ss);
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
				

				data_isbn = data_isbn.replace("平裝", "");
				data_isbn = data_isbn.replace("精裝", "");
				data_isbn = data_isbn.replace("()", "");
				data_isbn = data_isbn.replace(":", "");

				json.author = data_author;
				json.isbn = data_isbn;
				json.publish_year = data_year;
				json.publisher = data_publisher;
				json.links = searchUrl;
				json.searchState = "true";
				
				console.log(json);
		})
	})
	.catch(reason => {
		console.log("");
		console.log(reason);
	});
	
	Promise.all([searchrp]).then(()=>{
		console.log("finish");
	})
}
function Xinpei_url(){
	console.log("start xinpei url")
	var counter = 0;
	var options = {
			    uri: 'http://webpac.tphcc.gov.tw/toread/opac/search?',
			    qs: {
			        q:"app",
			        max:"2",
			        view:"CONTENT",
			        location:"0",
			    },
			    timeout:5000,
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
	var start = Date.now();
	const pr = rp(options)
	.then(function($){
		clearInterval(interval);
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
				counter++;
		})
	})
	.catch(reason =>{
		console.log(reason);
	})

	var interval = setInterval(() => {
	  console.log("Waiting:",(Date.now() - start) / 1000);
	}, 1000)

	return Promise.all([pr]).then(()=>{
		console.log(counter);
	})
	
}

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
	request("http://webpac.lib.ntpu.edu.tw/content.cfm?mid=153578&m=ss&k0=java&t0=k&c0=and&list_num=10&current_page=1&mt=&at=&sj=&py=&it=&lr=&lg=&si=6",function(err,resp,html){    //get 用qs來傳送參數
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
							const imagerp = new Promise(function(resolve,reject){
								setTimeout(function(){
									var options = {
											    uri: image,
											    json: true, // Automatically parses the JSON string in the response
												transform: function(body){
													return cheerio.load(body);
												}
											};
									rp(options)
									.then(function($){
											var real = $("img").attr("src");
											if(real == image)
											{
												resolve("true");
											}
											else
											{
												reject("false");
											}		
									})
									.catch(reason => {
										reject(reason);
									})
								}, 1500);
							})
							imagerp.then(msg =>
							{
								console.log("good");
							})
							.catch(reason => {
								image = "";
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
			        list_num:"25",
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

							var ISBN = $(".info_box").find("p").html().split("<br>");

							var true_isbn="";
							var img = $(".photo").find("img").attr("src");

							for(var key in ISBN)
							{
								var text = ISBN[key].trim();
								if(text.search("ISBN")>=0)
								{
									var first_ISBN = text.replace("ISBN ： ","");
		
									true_isbn = first_ISBN;
									break;
								}
							}
							
							var Bookjson = {
								"location":"ntpu",
								"title":title,
								"author":author,
								"publisher":publisher,
								"publish_year":publish_year,
								"ISBN":true_isbn,
								"link":mylink,
								"image":img
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
			        k0:"pipeline",
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
			    timeout : 3000,
			    resolveWithFullResponse: true,
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
					
					
					
			})
			.then(function(){
				 //db.ref('/isFinish').set("True");
			})
			.catch(function(err){
				console.log(err);
			});
	
}
function sleep(ms) {
  			return new Promise(resolve => setTimeout(resolve, ms));
		}
function test(){
	var options = {
			    uri: 'http://book.tpml.edu.tw/webpac/webpacIndex.jsp',
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
					

					var json = {};
					 $('.tagCloud > ul > li').each(function () {
		            	var key = $(this).text().trim()
		            	var json = {[key]:key};
		            	console.log(json);
		          });
				
			})
			.then(function(){
				 //db.ref('/isFinish').set("True");
			})
			.catch(function(err){
				console.log(err);
			});
}
//Xinpei_url();
Xinpei("http://webpac.tphcc.gov.tw/toread/opac/bibliographic_view/461884?location=0&mps=50&ob=desc&q=app&sb=relevance&start=0&view=CONTENT");
//test_for_search_url();