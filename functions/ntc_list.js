exports.ntc_list = functions.database.ref('/user_data/{userId}/library_account/ntc_lib/key')
.onCreate(event =>{
    
	event.data.ref.parent.child('State').set('initialize')
	const uid = event.params.userId;
	const pr1 = event.data.ref.parent.child('account').once('value');
	const pr2 = event.data.ref.parent.child('password').once('value');
	console.log("start fetching username and password from "+uid+"....")
	var instance, _page;
	return Promise.all([pr1,pr2]).then(results =>{
		event.data.ref.parent.child('State').set('pending')
		console.log("fetching success!")
		const username = results[0].val()
		const password = results[1].val()
		console.log("user is "+username);
		const pr = 
		  phantom
		  .create()
		  .then(ph => {
		    instance = ph
		    return instance.createPage()
		  })
		  .then(page => {
		  	console.log("create page success")
		    _page = page
		    _page.setting('userAgent', "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36")
		    _page.on('onConsoleMessage', true, function(msg) {
		        console.log('msg: ' + msg)
		    })
		    return _page.open('http://www.library.ntpc.gov.tw/loginControl/')
		  })
		  .then(status => {
        return new Promise(function (resolve, reject) {
          var condition = 0  // 0: timeout  1: success 2: fail
            _page.on('onUrlChanged', function (url) {
                if (url == 'http://www.library.ntpc.gov.tw/') {
                    condition = 1
                    resolve()
                }
            })

            _page.evaluate(function (name, pass) {
                document.querySelector("input[id='loginUsername']").value = name
                document.querySelector("input[id='loginPassword']").value = pass
                document.querySelector("input[name='codenumber']").value = document.querySelector("input[id='codeVal']").value
                document.querySelector("input[type='submit']").onclick();
                console.log("Login submitted!")
            }, username, password)
            .then(() => {
                var start = new Date().getTime(),
                    interval = setInterval(function () {
                    //  20s 超時
                    if ((new Date().getTime() - start < 20000) && condition == 0) {
                        console.log((new Date().getTime() - start))
                        _page.property('content')
                            .then((body) => {
                                var $ = cheerio.load(body)
                                if ($('td > #messSpan').text() != null) {
                                    condition = 2
                                }
                            })
                    } else {
                        if (condition == 0) {
                            reject("timeout");
                            clearInterval(interval); //< Stop this interval
                        } else if (condition == 1) {
                            console.log("finished in " + (new Date().getTime() - start) + "ms.");
                            clearInterval(interval); //< Stop this interval
                        } else {
                            reject("Incorrect passward!!")
                            clearInterval(interval); //< Stop this interval
                        }
                    }
                }, 500); //< repeat check every 500ms
            })
        })
      })
      .then((p)=> {
        console.log(username+": log success!")
        return _page.property('content')
      })
      .then((content)=> {
        var $ = cheerio.load(content)
        var url = $(".remove-text-nodes:nth-child(1) > li:nth-child(3) > a").attr('href')
        //console.log(url)
        return _page.open(url)
      })
      .then((p)=> {
        return new Promise(resolve => setTimeout(resolve, 3000))
      })
      .then((p)=> {
        return _page.property('content')
      })
      .then((content)=> {
        //console.log('loading list')
        var $ = cheerio.load(content)
    
        var data = $('#If_11 > tbody > tr > td')
        for (var i = 0; i < data.length; i+=12) {
          var borrow_time = $(data[i + 8]).text().trim()
          var location = "新北市立圖書館 " + $(data[i + 3]).text().trim()
          var renew_count = $(data[i + 10]).text().trim()
          var title = $(data[i + 2]).text().trim()
          var search_book_number = $(data[i + 6]).text().trim()
    
          var json = {
              "borrow_time": borrow_time,
              "location": location,
              "renew_count": renew_count,
              "title": title,
              "search_book_number": search_book_number
          }
          /////////////////////////////////////////////////////
          admin.database().ref('/user_data/{userId}/borrow_book/list').push(json);
          /////////////////////////////////////////////////////
        }
        return new Promise(resolve => setTimeout(resolve, 3000))
      })
      .then((p)=> {
        return _page.open('http://webpac.tphcc.gov.tw/toread/opac/patron_transactions?t=history')
      })
      .then((p)=> {
        return new Promise(resolve => setTimeout(resolve, 2000))
      })
      .then((p)=> {
        return _page.property('content')
      })
      .then((content)=> {
        //console.log('loading history')
        var $ = cheerio.load(content)
    
        var data = $('.items_tbl_wrap > div > div:nth-child(2) > table > tbody > tr > td')
        for (var i = 0; i < data.length; i+=9) {
          var borrow_time = $(data[i + 6]).text().trim()
          var location = "新北市立圖書館 " + $(data[i + 3]).text().trim()
          var title = $(data[i + 1]).text().trim()
          var search_book_number = $(data[i + 5]).text().trim()
    
          var json = {
              "borrow_time": borrow_time,
              "location": location,
              "title": title,
              "search_book_number": search_book_number
          }
          /////////////////////////////////////////////////////
          admin.database().ref('/user_data/{userId}/borrow_book/list').push(json);
          /////////////////////////////////////////////////////
        }
        return new Promise(resolve => setTimeout(resolve, 1000))
      })
      .then((p)=> {
        const off = _page.off('onLoadFinished');
        return Promise.all([off])
      })
      .then(()=> {
        event.data.ref.parent.child('State').set('Finish')
        instance.exit()
      })
      .catch(e => {
        console.log(username+"login Failed! " + e)
        const off = _page.off('onLoadFinished');
        return Promise.all([off]).then(()=>{
          event.data.ref.parent.child('State').set('Error')
          instance.exit()
        })
      });

      return Promise.all([pr]).then(()=>{
        return event.data.ref.parent.child('key').remove()
      })
    })
})