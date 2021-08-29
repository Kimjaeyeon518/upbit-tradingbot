const fetch = require("node-fetch");

const url = "https://api.upbit.com/v1/market/all?isDetails=false&market=KRW";
const options = { method: "GET", headers: { Accept: "application/json" } };
var count = 0;

function getKRW(json) {
  for (var i = 0; i < json.length; i++) {
    if (json[i].market.includes("KRW")) {
      console.log(count++);
      console.log("{");
      console.log(`"market": "${json[i].market}",`);
      console.log(`"korean_name": "${json[i].korean_name}",`);
      console.log(`"english_name": "${json[i].english_name}",`);
      console.log("},");
    }
  }
}

// marketList.json 생성을 위한 fetch
fetch(url, options)
  .then((res) => res.json())
  .then((json) => getKRW(json))
  .then(console.log(count))
  .catch((err) => console.error("error:" + err));
