exports.tc_list = functions.database.ref('/user_data/{userId}/library_account/tc_lib/key')
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
        instance = ph;
        return instance.createPage();
      })
      .then(page => {
        _page = page;
        _page.setting('userAgent', "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36")
        _page.on('onConsoleMessage', true, function(msg) {
            console.log(msg)
        })
        return _page.open('http://book.tpml.edu.tw/webpac/webpacIndex.jsp');
      })
      .then(status => {
        return new Promise(function (resolve, reject) {
          _page.on('onAlert', function (msg) {
            reject(msg)
          })
          _page.on('onLoadFinished', function (status) {
            resolve(status)
          })
          _page.evaluate(function (name, pass) {
            
            document.querySelector("form[name='memberlogin']").autocomplete = "on";
            document.querySelector("input[name='account2']").value = name;
            document.querySelector("input[name='passwd2']").value = pass;
            document.querySelector("form[name='memberlogin']").submit();
            
          },username,password)
        })
      })
      .then((p)=> {
        console.log(username+": log success!")
        return _page.open('http://book.tpml.edu.tw/webpac/personalization/MyLendList1.jsp');
      })
      .then((p)=> {
        return new Promise(resolve => setTimeout(resolve, 5000))
      })
      .then((p)=> {
        return _page.property('content')
      })
      .then((content)=> {
        //console.log('loading list')
        var $ = cheerio.load(content)
    
        var data = $('#lendlist > tbody > tr > td')
        for (var i = 0; i < data.length; i+=9) {
          var author = $(data[i + 6]).text().trim()
          var borrow_time = $(data[i + 7]).text().trim()
          var location = "臺北市立圖書館"
          var renew_count = $(data[i + 3]).text().trim()
          var title = $(data[i + 5]).text().trim()
          var search_book_number = $(data[i + 4]).text().trim()
    
          var json = {
              "author": author,
              "borrow_time": borrow_time,
              "location": location,
              "renew_count": renew_count,
              "title": title,
              "search_book_number": search_book_number
          }
          /////////////////////////////////////////////////////
          admin.database().ref('/user_data/{userId}/borrow_book/list').push(json);
          //console.log(json);
          //console.log('\n')
          /////////////////////////////////////////////////////
        }
        return new Promise(resolve => setTimeout(resolve, 1000))
      })
      .then((p)=> {
        return _page.open('http://book.tpml.edu.tw/webpac/personalization/MyLendHistory.do');
      })
      .then((p)=> {
        return new Promise(resolve => setTimeout(resolve, 5000))
      })
      .then((p)=> {
        return _page.property('content')
      })
      .then((content)=> {
        //console.log('loading history')
        var $ = cheerio.load(content)
    
        var data = $('.tablesorter > tbody > tr > td')
        for (var i = 0; i < data.length; i+=6) {
          var author = $(data[i + 3]).text().split(' / ')[1].trim()
          var borrow_time = $(data[i + 4]).text().trim()
          var location = "臺北市立圖書館 " + $(data[i + 5]).text().trim()
          var title = $(data[i + 3]).text().split(' / ')[0].trim()
          var search_book_number = $(data[i + 2]).text().trim()
    
          var json = {
              "author": author,
              "borrow_time": borrow_time,
              "location": location,
              "title": title,
              "search_book_number": search_book_number
          }
          /////////////////////////////////////////////////////
          admin.database().ref('/user_data/{userId}/borrow_book/list').push(json);
          //console.log(json);
          //console.log('\n')
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