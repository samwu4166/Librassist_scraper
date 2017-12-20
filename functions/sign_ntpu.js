'use strict'
var phantom = require('phantom')


var instance, _page
const username = "410485024";
const password = "A129762071";
const pr = 
   phantom
  .create()
  .then(ph => {
    instance = ph
    return instance.createPage()
  })
  .then(page => {
    _page = page
    _page.setting('userAgent', "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36")
    _page.on('onConsoleMessage', true, function(msg) {
        //console.log('msg: ' + msg)
    })
    return _page.open('http://webpac.library.ntpu.edu.tw/Webpac2/Person.dll/')
  })
  .then(status => {
    return new Promise(function (resolve, reject) {
      _page.on('onAlert', function (msg) {
        reject(msg)
      })
      _page.on('onLoadFinished', function (status) {
        //console.log("Status: ' + status);
        resolve(status)
      })
      
      _page.evaluate(function (name,pass) {
        
        document.querySelector("input[name='RNO']").value = name
        document.querySelector("input[name='PWD']").value = pass
        document.querySelector("form[name='CODE']").submit()

        //console.log("Submitted!")
      },username,password)
    })
  })
  .then((p)=> {
    console.log("log success!")
    const off = _page.off('onLoadFinished');
    return Promise.all([off])
  })
  .then(()=> {
    instance.exit()
  })
  .catch(e => {
    console.log("Failed! " + e)
    const off = _page.off('onLoadFinished');
    return Promise.all([off]).then(()=>{
      instance.exit()
    })
  });
 
  Promise.all([pr]).then(()=>{
  	console.log("Finish");
  })
  