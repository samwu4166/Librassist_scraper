var request = require("request");
var cheerio = require("cheerio");
var firebase = require("firebase");
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
		var $ = cheerio.load(html);
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
					console.log(json);
				}
		
				
		})
		//console.log(html);
	});
}

function test()
{
	var url = "http://webpac.tphcc.gov.tw/toread/opac/search?q=java&max=&view=CONTENT&location=";


	request({url:url},function(err,resp,html){    //get 用qs來傳送參數
		var $ = cheerio.load(html);
		var title;
		var	author;

		var json = {title:""};
		$(".reslt_item_head").filter(function(){
				var data_title = $(this).text().trim();
				
				if(data_title!=""){
					json.title = data_title;
					console.log(json);
				}

				else{
					//console.log("failed!");
				}
			
		})
		//console.log(html);
	});
}

ntpu("python","1","10");