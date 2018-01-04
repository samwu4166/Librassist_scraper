exports.ntpu_list = functions.database.ref('/user_data/{userId}/library_account/ntpu_lib/key')
.onCreate(event =>{
    
	event.data.ref.parent.child('State').set('initialize')
	const uid = event.params.userId;
	const pr1 = event.data.ref.parent.child('account').once('value');
	const pr2 = event.data.ref.parent.child('password').once('value');
	console.log("start fetching username and password from "+uid+"....")
	var instance, _page, _url_borrow, _url_hist
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
		    return _page.open('http://webpac.library.ntpu.edu.tw/Webpac2/Person.dll/')
		  })
		  .then(status => {
        return new Promise(function (resolve, reject) {
          _page.on('onAlert', function (msg) {
            reject(msg)
          })
          _page.on('onLoadFinished', function (status) {
            resolve(status)
          })

          _page.evaluate(function (name,pass) {

            document.querySelector("input[name='RNO']").value = name;
            document.querySelector("input[name='PWD']").value = pass;
            document.querySelector("form[name='CODE']").submit();
            return new Promise(resolve => setTimeout(resolve, 5000))

          },username,password)
        })
      })
      .then((status)=> {
        _page.sendEvent('keydown', 16777217, null, null)
        _page.sendEvent('keydown', 16777217, null, null)
        _page.sendEvent('keydown', 16777217, null, null)
        _page.sendEvent('keydown', 16777217, null, null)
        _page.sendEvent('keydown', 16777221, null, null)
        return Promise.all([
          _page.off('onAlert'),
          new Promise(function (resolve) {
            _page.on('onResourceReceived', function(response) {
              if (response.stage == 'end') {
                var sss = JSON.parse(JSON.stringify(response))
                _url_borrow = sss["url"]
                resolve()
              }
            })
          })
        ])
      })
      .then((p)=> {
        _page.sendEvent('keydown', 16777217, null, null)
        _page.sendEvent('keydown', 16777221, null, null)
        return Promise.all([
          _page.off('onResourceReceived'),
          new Promise(function (resolve) {
            _page.on('onResourceReceived', function(response) {
              if (response.stage == 'end') {
                var sss = JSON.parse(JSON.stringify(response))
                _url_hist = sss["url"]
                resolve()
              }
            })
          })
        ])
      })
      .then((p)=>{
        return Promise.all([
          _page.off('onResourceReceived'),
          _page.open(_url_borrow)
        ])
      })
      .then((p)=>{
        return new Promise(resolve => setTimeout(resolve, 3000))
      })
      .then((p)=>{
        return _page.property('content')
      })
      .then((content)=>{
        console.log('loading list')
        var $ = cheerio.load(content)
    
        var data = $('table:nth-child(3) > tbody > tr > td')
        for (var i = 9; i < data.length; i+=9) {
          var author = $(data[i + 4]).text().trim()
          var location = "臺北大學圖書館 " + $(data[i + 2]).text().trim()
          var renew_count = $(data[i + 6]).text().trim()
          var title = $(data[i + 3]).text().trim()
    
          var json = {
              "author": author,
              "location": location,
              "renew_count": renew_count,
              "title": title,
          }
          /////////////////////////////////////////////////////
          admin.database().ref('/user_data/{userId}/borrow_book/list').push(json);
          /////////////////////////////////////////////////////
        }
        return new Promise(resolve => setTimeout(resolve, 3000))
      })
      .then((p)=>{
        return _page.open(_url_hist)
      })
      .then((p)=>{
        return new Promise(resolve => setTimeout(resolve, 3000))
      })
      .then((p)=>{
        return _page.property('content')
      })
      .then((content)=>{
        console.log('loading history')
        var $ = cheerio.load(content)
    
        var data = $('table:nth-child(2) > tbody > tr > td')
        for (var i = 11; i < data.length; i+=8) {
          var author = $(data[i + 5]).text().trim()
          var borrow_time = $(data[i + 1]).text().trim()
          var location = "臺北大學圖書館 " + $(data[i + 3]).text().trim()
          var title = $(data[i + 4]).text().trim()
          var search_book_number = $(data[i + 7]).text().trim()
    
          var json = {
              "author": author,
              "borrow_time": borrow_time,
              "location": location,
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