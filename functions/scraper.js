const phantom = require('phantom');
var cheerio = require("cheerio");
var sitepage = null;
var phInstance = null;


function scraper_shinpei(key) {							
    
    var url = "http://webpac.tphcc.gov.tw/toread/opac/search?q="+key+"&max=0&view=CONTENT&location=0"
    var url2 = "http://book.tpml.edu.tw/webpac/webpacIndex.jsp";
    var url3 = "http://www.bdtong.co.kr/index.php?c_category=C02";
    var phantom_instance = null;
    var sitepage = null;
    var page_title = null;
    var start_time = null;
    var end_time = null;
    var interval_obj = null;
    var loading_time = 0;
    console.log("running");
    phantom.create(['--ignore-ssl-errors=yes'],{})
        .then(function(instance) {
            phantom_instance = instance;
            return phantom_instance.createPage();
        })
        .then(function(page) {
        	page.property('Request Headers', {
				'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36",
				"Accept-Language":"en-US,en;q=0.9",
				"Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
				"Connection":"keep-alive"   
			});
            sitepage = page;
            start_time = Date.now();
            return page.open(url2).then(status => {
            	console.log(status+" open the page");
            	return page.includeJs('https://code.jquery.com/jquery-3.1.1.min.js');
            });
        })
        .then(function(status) {
           console.log(status+" has been inject !");

           sitepage.on("onConsoleMessage",
           		function(msg){
             		console.log(msg);
           });
           sitepage.evaluate(function(){
           		console.log("URL :"+document.URL+"\n");
              
		    	    $('.tagCloud > ul > li').each(function () {
		            	console.log($(this).text().trim());
		          });
              
           	});
         
           return sitepage.close();
		})
		.then(function(unuse){
			phantom_instance.exit();
		})
		.catch(function(err){
			console.log(err);
			phantom_instance.exit();
		})
}
scraper_shinpei("android");