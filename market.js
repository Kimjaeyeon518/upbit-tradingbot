const fetch = require("node-fetch");

const url = "https://api.upbit.com/v1/market/all?isDetails=false&market=KRW";
const options = { method: "GET", headers: { Accept: "application/json" } };

function getKRW(json) {
  for (var i = 0; i < json.length; i++) {
    if (json[i].market.includes("KRW")) {
      console.log("{");
      console.log('"market": ' + `"${json[i].market}",`);
      console.log('"korean_name": ' + `"${json[i].korean_name}",`);
      console.log('"english_name": ' + `"${json[i].english_name}",`);
      console.log("},");
    }
  }
}

fetch(url, options)
  .then((res) => res.json())
  .then((json) => getKRW(json))
  .catch((err) => console.error("error:" + err));
